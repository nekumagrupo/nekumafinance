const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage({ serviceWorkers: 'block' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('https://**/*', route => route.abort());
    await page.route('**/supabase-config.js*', route => route.fulfill({ contentType: 'application/javascript', body: 'window.PONTE_SUPABASE_CONFIG = {};' }));
    await page.route('**/app.js*', route => route.fulfill({ contentType: 'application/javascript', body: fs.readFileSync('outputs/finance-pwa/app.js', 'utf8').replace('  initApp();', `
      window.testLogin = () => { remoteStore.enabled = true; remoteSession.status = "signedOut"; render(); };
      window.testSignup = () => {
        remoteStore.client = { auth: {
          signUp: () => new Promise(resolve => { window.finishSignup = resolve; }),
          signOut: async () => ({ error: null })
        } };
        window.testLogin();
      };
      initApp();`) }));
    await page.goto('http://127.0.0.1:4174/app.html?auth=login');
    await page.evaluate(() => window.testLogin());
    for (const [width, height] of [[390, 844], [375, 667], [1440, 900], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => window.testLogin());
      await page.waitForTimeout(250);
      await page.evaluate(() => window.testLogin());
      assert.equal(await page.locator('#loginEmail').count(), 1);
      assert.equal(await page.locator('#loginPassword').count(), 1);
      assert.equal(await page.locator('[data-action="install-login"]').count(), 1);
      assert.equal(await page.locator('.auth-visual').isVisible(), false);
      assert.equal(await page.locator('.auth-home-brand').getAttribute('href'), './index.html?home=1');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      if (height >= 667) assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1));
      await page.screenshot({ path: `work/login-${width}.png`, fullPage: true });
    }
    const manifest = JSON.parse(fs.readFileSync('outputs/finance-pwa/manifest.webmanifest', 'utf8'));
    assert.equal(manifest.start_url, './app.html?auth=login');
    assert.equal(manifest.display, 'standalone');
    await page.goto('http://127.0.0.1:4174/app.html?auth=signup&lang=pt-BR');
    await page.evaluate(() => window.testSignup());
    for (const width of [320, 375, 390, 600, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const brand = await page.locator('.auth-home-brand').boundingBox();
      const language = await page.locator('.auth-navigation summary').boundingBox();
      const heading = await page.locator('.auth-card-head').boundingBox();
      assert.ok(brand && language && heading);
      assert.ok(Math.abs((brand.y + brand.height / 2) - (language.y + language.height / 2)) <= 2);
      assert.ok(brand.x + brand.width < language.x && language.x + language.width <= width);
      if (width <= 600) assert.ok(language.y + language.height < heading.y);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator('.auth-navigation summary').click();
    assert.ok(await page.locator('.nekuma-language-menu').isVisible());
    await page.locator('.auth-navigation summary').click();
    await page.screenshot({ path: 'work/signup-390.png', fullPage: true });
    const signupForm = page.locator('[data-form="auth-signup"]');
    const submit = signupForm.getByRole('button', { name: 'Criar login' });
    await page.locator('#signupName').fill('Teste Mobile');
    await page.locator('#signupEmail').fill('teste@example.invalid');
    await page.locator('#signupPassword').fill('mock-password');
    await submit.click();
    assert.equal(await signupForm.getAttribute('aria-busy'), 'true');
    assert.ok(await submit.isDisabled());
    assert.equal(await page.locator('#signupEmail').inputValue(), 'teste@example.invalid');
    await page.evaluate(() => window.finishSignup({ error: new Error('Falha simulada') }));
    assert.equal(await signupForm.getByRole('status').textContent(), 'Falha simulada');
    assert.equal(await page.locator('#signupEmail').inputValue(), 'teste@example.invalid');
    assert.ok(await submit.isEnabled());
    await submit.click();
    await page.evaluate(() => window.finishSignup({ data: { session: { user: { id: 'mock' } } }, error: null }));
    await page.getByRole('heading', { name: 'Conta criada' }).waitFor();
    assert.match(await page.getByRole('link', { name: 'Entrar no Nekuma' }).getAttribute('href'), /auth=login/);
    assert.equal(await page.locator('#signupPassword').count(), 0);
    assert.match(page.url(), /auth=signup/);
    assert.deepEqual(errors, []);
    console.log('PASS: responsive login and signup, aligned language picker, retained form on failure, and inline signup success.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
