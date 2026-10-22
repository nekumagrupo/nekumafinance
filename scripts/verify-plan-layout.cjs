const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const source = fs.readFileSync('outputs/finance-pwa/app.js','utf8');
function extract(name) {
  const start = source.indexOf(`  function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n  function ', start + 1));
}
const context = vm.createContext({
  state: { creditCards:[{id:'first'},{id:'legacy'}], ui:{selectedMonth:'2026-10'} },
  remoteSession:{user:{id:'test'},commercialAccess:null}, remoteStore:{enabled:true},
  number:Number, formatMoneyWithPrimary:n=>`JPY ${n}`, formatMoney:n=>`JPY ${n}`,
  escapeHtml:String, showPlanUpgrade:()=>{}, showToast:()=>{}, findItem:()=>null
});
vm.runInContext(['commercialSnapshot','hasCommercialFeature','hasFamilyAccess','commercialTabAllowed',
  'commercialFeatureForType','guardCommercialForm','housingItemOccursInMonth',
  'renderSalaryFormula','renderSalaryPredictionDetails','renderMobileMenuModal'].map(extract).join('\n'),context);
function run(code) { return vm.runInContext(code,context); }
function plan(name) {
  context.remoteSession.commercialAccess={userId:'test',plan:name,personalPlan:name,limits:{features:name==='free'?['cards']:['cards','projections','wealth','salary_projection']}};
}
for (const recurring of [false,true]) {
  context.item={startMonth:'2026-10',recurring};
  assert.equal(run('housingItemOccursInMonth(item,"2026-09")'),false);
  assert.equal(run('housingItemOccursInMonth(item,"2026-10")'),true);
  assert.equal(run('housingItemOccursInMonth(item,"2026-11")'),recurring);
}
assert.match(extract('housingCardMonthRows'),/housingItemOccursInMonth/);
assert.match(extract('companyHousingDeductionEntries'),/housingItemOccursInMonth/);
assert.match(extract('saveHousingCard'),/StartMonth/);
context.card={kind:'factory',amount:100000,currency:'JPY',month:'2026-10',deductions:{configured:true,total:15000}};
plan('free');
assert.match(run('renderSalaryFormula(card,false)'),/100000/);
assert.doesNotMatch(run('renderSalaryFormula(card,false)'),/15000|85000|liquido/);
assert.equal(run('renderSalaryPredictionDetails(card)'), '');
assert.doesNotMatch(run('renderSalaryFormula(card,true)'),/100000/);
assert.equal(run('guardCommercialForm("credit-card",{})'),false);
assert.equal(run('guardCommercialForm("credit-card",{id:"first"})'),true);
assert.equal(run('guardCommercialForm("credit-card",{id:"legacy"})'),false);
assert.equal(run('guardCommercialForm("card-purchase",{cardId:"legacy"})'),false);
context.state.creditCards=[];
assert.equal(run('guardCommercialForm("credit-card",{})'),true);
for(const name of ['free','pro','family']) {
  plan(name);
  const menu=run('renderMobileMenuModal()');
  assert.equal(menu.includes('data-tab="family"'),name==='family');
  for(const tab of ['budgets','projections','wealth']) assert.equal(menu.includes(`data-tab="${tab}"`),name!=='free');
  for(const tab of ['dashboard','referrals','accounts','cards','reports','crypto','plans','settings']) assert.ok(menu.includes(`data-tab="${tab}"`));
}

(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page=await browser.newPage();
  const dashboard=fs.readFileSync('outputs/finance-pwa/dashboard.js','utf8');
  const keys=['overview-card','work-calendar-panel','subscriptions-panel','dashboard-cards-panel','housing-panel','vehicle-panel','family-panel','family-tools-panel','family-pie-panel','financial-calendar-panel','dashboard-trend-panel','crypto-panel','goals-panel','emergency-reserve-panel','nubank-boxes-home-panel','debt-home-panel','consortium-home-panel','budget-summary-panel','balance-projection-panel','recent-transactions-panel'];
  for(const width of [320,390,759,1280]) for(const name of ['free','pro','family']) {
   await page.setViewportSize({width,height:900});
   await page.setContent(`<main><div class="desktop-dashboard-shell"><div class="desktop-dashboard-column">${keys.slice().reverse().map(key=>`<article class="content-panel ${key}"><h2>${key}</h2></article>`).join('')}</div></div></main>`);
   await page.addStyleTag({content:fs.readFileSync('outputs/finance-pwa/styles.css','utf8')});
   await page.addScriptTag({content:dashboard});
   const result=await page.evaluate(({name})=>{
    window.saved=0; window.sorted=0;
    window.Sortable=class { constructor(){window.sorted++;} destroy(){} };
    NekumaDashboard.setup(document.querySelector('main'),{mobile:['recent-transactions-panel']},()=>window.saved++,'2026-10',{plan:name,family:name==='family'});
    return {keys:[...document.querySelectorAll('[data-dashboard-card]')].map(el=>el.dataset.dashboardCard),handles:document.querySelectorAll('.dashboard-handle').length,sorted:window.sorted,saved:window.saved,overflow:document.documentElement.scrollWidth>innerWidth};
   },{name});
   const family=['family-panel','family-tools-panel','family-pie-panel'];
   const paid=['goals-panel','emergency-reserve-panel','nubank-boxes-home-panel','debt-home-panel','consortium-home-panel','budget-summary-panel','balance-projection-panel'];
   const expected=keys.filter(key=>(width<1180||key!=='overview-card')&&(name==='family'||!family.includes(key))&&(name!=='free'||!paid.includes(key)));
   assert.equal(result.keys.length,expected.length);
   if(width<760) assert.deepEqual(result.keys,name==='free'?expected:['recent-transactions-panel',...expected.filter(key=>key!=='recent-transactions-panel')]);
   assert.equal(result.handles>0,name!=='free');
   assert.equal(result.sorted>0,name!=='free');
   if(name==='free') assert.equal(result.saved,0);
   assert.equal(result.overflow,false,`${name}/${width}`);
   // Downgrade must preserve the user's paid layout without using it in Free.
   if(width===390) {fs.mkdirSync('work',{recursive:true});await page.screenshot({path:`work/plan-layout-${name}-390.png`,fullPage:true});}
  }
  console.log('PASS: recurrence boundaries, salary gross-only, card quotas, plan menus, mobile order, paid customization and responsive bounds. VM/Chromium fixtures, not live database tests.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
