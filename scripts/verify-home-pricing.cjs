const assert = require('node:assert/strict');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const base = process.env.HOME_PREVIEW_URL || 'http://127.0.0.1:4182';
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage({serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  for (const width of [320,390,768,1280,1920]) {
   await page.setViewportSize({width,height:1000});
   await page.goto(`${base}/index.html?home=1&lang=pt-BR`);
   for (const locale of ['pt-BR','en-US','ja-JP']) {
    await page.locator('[data-public-language]').selectOption(locale);
    const details=page.locator('.plan-comparison-details');
    const toggle=details.locator('summary');
    assert.equal(await details.getAttribute('open'),null);
    assert.equal(await page.locator('.plan-comparison-table').isVisible(),false);
    assert.equal(await page.locator('.home-plan li').count(),9);
    await toggle.click();
    assert.equal(await page.locator('.plan-comparison-table').isVisible(),true);
    assert.equal(await page.locator('.home-plan').count(),3);
    assert.equal(await page.locator('[data-plan-feature]').count(),27);
    assert.match(await page.locator('.home-plan-pro .home-plan-price').innerText(),/480/);
    assert.match(await page.locator('.home-plan-family .home-plan-price').innerText(),/850/);
    assert.match(await page.locator('.home-plan-free .button').getAttribute('href'),/auth=signup/);
    for (const plan of ['pro','family']) assert.match(await page.locator(`.home-plan-${plan} .button`).getAttribute('href'),/tab=plans/);
    const bounds=await page.evaluate(()=>{
      const grid=document.querySelector('.home-plan-grid');
      return {overflow:document.documentElement.scrollWidth>innerWidth,columns:getComputedStyle(grid).gridTemplateColumns.split(' ').length,
       controls:[...grid.querySelectorAll('a')].every(el=>el.scrollWidth<=el.clientWidth+1),
       icons:document.querySelectorAll('#planos i[data-lucide]').length};
    });
    assert.equal(bounds.overflow,false,`${width}/${locale}: page overflow`);
    assert.equal(bounds.controls,true,`${width}/${locale}: button text overflow`);
    assert.equal(bounds.icons,0);
    assert.equal(bounds.columns,width<=700?1:3);
    assert.equal(await page.locator('[data-plan-feature="3"] .is-included').count(),3);
    assert.equal(await page.locator('[data-plan-feature="4"] .is-excluded').count(),1);
    assert.equal(await page.locator('[data-plan-feature="24"] .is-excluded').count(),2);
    const excluded=page.locator('.comparison-value.is-excluded');
    assert.equal(await excluded.count(),await excluded.locator('svg[data-lucide="x"]').count());
    assert.ok(await excluded.count()>0);
    if(locale==='pt-BR'&&[390,1280].includes(width)){
     fs.mkdirSync('work',{recursive:true});
     await toggle.click();
     await page.evaluate(()=>document.querySelector('#planos').scrollIntoView({block:'start',behavior:'instant'}));
     await page.locator('#pricing-title').click();
     await page.screenshot({path:`work/home-pricing-${width}.png`});
     await toggle.click();
     await page.evaluate(()=>document.querySelector('#comparison-title').scrollIntoView({block:'start',behavior:'instant'}));
     await page.locator('#comparison-title').click();
     await page.screenshot({path:`work/home-comparison-${width}.png`});
    }
    await toggle.focus();
    await toggle.press('Enter');
    assert.equal(await details.getAttribute('open'),null);
    assert.equal(await page.locator('.plan-comparison-table').isVisible(),false);
   }
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(`${base}/index.html?home=1&lang=pt-BR#planos`);
  await page.locator('.plan-comparison-details summary').click();
  await page.locator('[data-public-language]').selectOption('en-US');
  assert.notEqual(await page.locator('.plan-comparison-details').getAttribute('open'),null);
  await page.locator('[data-public-language]').selectOption('pt-BR');
  const scroll=page.locator('.comparison-scroll');
  const stickyBefore=await page.locator('[data-plan-feature="3"] th').boundingBox();
  await scroll.evaluate(el=>{el.scrollLeft=el.scrollWidth;});
  const stickyAfter=await page.locator('[data-plan-feature="3"] th').boundingBox();
  assert.equal(Math.round(stickyBefore.x),Math.round(stickyAfter.x));
  await page.getByRole('link',{name:'Conhecer o PRO',exact:true}).click();
  assert.ok(page.url().includes('tab=plans'));
  assert.deepEqual(errors,[]);
  console.log('PASS: concise 3-plan summaries, comparison collapsed by default, click/keyboard expand-collapse, language state retention, 27 rows, X/check markers, prices, CTA destinations and responsive bounds. Local Chromium; no real checkout.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
