const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');

(async () => {
  const source = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
  const renderMenu = source.slice(source.indexOf('  function renderMobileMenuModal()'), source.indexOf('  function renderTransactionModal('));
  const openModal = source.slice(source.indexOf('  function openModal('), source.indexOf('  function renderDashboardTransactionList('));
  assert.match(openModal, /refreshIcons\(\)/);
  assert.match(openModal, /focus\(\{ preventScroll: true \}\)/);
  const root = path.resolve('outputs/finance-pwa');
  const server = http.createServer((req, res) => {
    if (req.url === '/preview') {
      res.setHeader('Content-Type','text/html');
      res.end('<body style="margin:0;background:#ddd;display:grid;place-items:center"><iframe title="Menu mobile 390px" src="/fixture" style="width:390px;height:844px;border:0"></iframe></body>'); return;
    }
    if (req.url === '/fixture') {
      res.setHeader('Content-Type','text/html');
      res.end(`<meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"><div id="modal-root"></div><script src="/assets/vendor/lucide.min.js"></script><script>
        ${renderMenu}
        const state={ui:{activeTab:'dashboard'}};
        const hasFamilyAccess=()=>true;
        const commercialTabAllowed=()=>true;
        const escapeHtml=s=>s;
        document.querySelector('#modal-root').innerHTML='<div class="modal-backdrop mobile-menu-backdrop"><div class="modal modal-mobileMenu" role="dialog">'+renderMobileMenuModal()+'</div></div>';
        lucide.createIcons();
      </script>`); return;
    }
    const file = path.resolve(root, '.' + req.url.split('?')[0]);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', file.endsWith('.css') ? 'text/css' : 'text/javascript');
    res.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  if (process.argv.includes('--preview')) {
    console.log(`Preview: http://127.0.0.1:${server.address().port}/preview`);
    return;
  }
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL || 'chrome' });
    const page = await browser.newPage();
    const base = `http://127.0.0.1:${server.address().port}`;
    await page.setContent(`<link rel="stylesheet" href="${base}/styles.css"><div id="modal-root"></div>`);
    await page.addScriptTag({ url: base + '/assets/vendor/lucide.min.js' });
    await page.evaluate(source => {
      const render = new Function('state','hasFamilyAccess','escapeHtml','commercialTabAllowed',source+'; return renderMobileMenuModal();');
      const content=render({ui:{activeTab:'dashboard'}},()=>true,s=>s,()=>true);
      document.querySelector('#modal-root').innerHTML='<div class="modal-backdrop mobile-menu-backdrop"><div class="modal modal-mobileMenu" role="dialog">'+content+'</div></div>';
      lucide.createIcons();
    }, renderMenu);
    await page.locator('.modal-mobileMenu').waitFor();
    for (const [width,height] of [[320,568],[390,844],[430,932],[844,390],[1280,800]]) {
      await page.setViewportSize({width,height});
      const result = await page.evaluate(() => {
        const menu=document.querySelector('.modal-mobileMenu');
        const rect=menu.getBoundingClientRect();
        const icons=[...document.querySelectorAll('.mobile-menu-icon')];
        return {
          fits:rect.top>=0 && rect.bottom<=innerHeight+1 && rect.left>=0 && rect.right<=innerWidth+1,
          icons:icons.length>0 && icons.every(el=>el.querySelector('svg')?.getBoundingClientRect().width===20),
          unresolved:menu.querySelectorAll('i[data-lucide]').length,
          scrollable:document.querySelector('.mobile-menu-groups').scrollHeight>0
        };
      });
      assert.deepEqual(result,{fits:true,icons:true,unresolved:0,scrollable:true},`${width}x${height}`);
      if (width===390) {
        fs.mkdirSync('work',{recursive:true});
        await page.screenshot({path:'work/mobile-menu-fixed-390.png'});
        await page.locator('.mobile-menu-groups').evaluate(el=>{el.scrollTop=el.scrollHeight;});
        await page.locator('[data-tab="settings"]').click();
        assert.ok(await page.locator('.mobile-menu-head').isVisible());
      }
    }
    console.log('PASS: mobile menu icons, bounds, scroll and persistent header at 320/390/430, landscape and desktop. Chromium layout; physical iPhone verification still required.');
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve=>server.close(resolve));
  }
})().catch(error=>{ console.error(error); process.exitCode=1; });
