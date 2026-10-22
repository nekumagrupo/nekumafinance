const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve('outputs/finance-pwa');
const server=http.createServer((req,res)=>{
 const pathname=new URL(req.url,'http://localhost').pathname;
 const file=path.resolve(root,'.'+(pathname==='/'?'/app.html':pathname));
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':'application/octet-stream');
 if(pathname==='/supabase-config.js'){res.end('window.PONTE_SUPABASE_CONFIG={};');return;}
 if(pathname==='/app.js'){
  res.end(fs.readFileSync(file,'utf8').replace('  initApp();',`window.planTest={createInitialState,normalizeState,render,openModal,housingCardMonthRows,companyHousingDeductionEntries,preserveRestrictedRecordFormats,guardCommercialForm,getState:()=>state,setState:s=>{state=s;},setPlan:plan=>{remoteSession.user={id:'fixture-user',email:'fixture@example.com'};remoteSession.commercialAccess={userId:'fixture-user',plan,personalPlan:plan,limits:{features:plan==='free'?['cards']:['cards','wealth','projections','salary_projection','metamask','binance']}};}}; initApp();`));return;
 }
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844},serviceWorkers:'block'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://**/*',route=>route.abort());
  await page.goto(`http://127.0.0.1:${server.address().port}/app.html`);
  await page.evaluate(()=>{
   const t=planTest,s=t.createInitialState();
   s.ui.activeTab='dashboard';s.ui.selectedMonth='2026-10';s.ui.hideBalance=false;
   s.bankAccounts=[{id:'bank',country:'japao',bankName:'Yucho',nickname:'Conta principal',currency:'JPY',balance:50000}];
   s.incomeSources=[{id:'factory',name:'Fabrica',type:'factory',currency:'JPY',bankAccountId:'bank',salaryHourlyRate:1500,salaryTeijiHours:8,salaryDeductionsEnabled:true,salaryIncomeTaxFixed:5000}];
   s.housingCards=[{id:'home',name:'Apartamento',country:'japao',currency:'JPY',items:[{key:'rent',label:'Aluguel',amount:50000,recurring:true,startMonth:'2026-10',paymentMethod:'company',companyId:'factory'}]}];
   t.setState(t.normalizeState(s));t.setPlan('free');t.render();
  });
  const recurrence=await page.evaluate(()=>({before:planTest.housingCardMonthRows(planTest.getState().housingCards[0],'2026-09').length,start:planTest.housingCardMonthRows(planTest.getState().housingCards[0],'2026-10').length,after:planTest.housingCardMonthRows(planTest.getState().housingCards[0],'2026-11').length,deductionBefore:planTest.companyHousingDeductionEntries({id:'factory',currency:'JPY'},'2026-09').length}));
  assert.deepEqual(recurrence,{before:0,start:1,after:1,deductionBefore:0});
  for(const plan of ['free','pro','family']){
   await page.evaluate(plan=>{planTest.setPlan(plan);planTest.render();},plan);
   assert.equal(await page.locator('.dashboard-mobile-zone .dashboard-handle').count()>0,plan!=='free');
   assert.equal(await page.locator('.family-panel').count()>0,plan==='family');
   assert.equal(await page.locator('.goals-panel').count()>0,plan!=='free');
   if(plan==='free'){
    assert.equal(await page.locator('.salary-prediction-breakdown').count(),0);
    assert.equal(await page.locator('.salary-gross-summary').count()>0,true);
    const text=await page.locator('.dashboard-finance-strip').innerText();
    assert.doesNotMatch(text,/liquido|descontos JPY|Divergente/i);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   fs.mkdirSync('work',{recursive:true});await page.screenshot({path:`work/app-plan-${plan}-390.png`});
   if(plan==='pro'){
    const first=page.locator('.dashboard-mobile-zone .work-calendar-panel .dashboard-handle');
    await first.focus();await first.press('ArrowDown');
    const moved=await page.evaluate(()=>planTest.getState().ui.dashboardLayouts.mobile);
    assert.ok(moved.indexOf('work-calendar-panel')>moved.indexOf('subscriptions-panel'));
   }
  }
  // A downgrade ignores but preserves the previously saved paid layout.
  const downgraded=await page.evaluate(()=>{
   const t=planTest,s=t.getState();s.ui.dashboardLayouts={mobile:['crypto-panel','recent-transactions-panel']};t.setPlan('free');t.render();
   return {layout:s.ui.dashboardLayouts.mobile,first:document.querySelector('[data-dashboard-card]')?.dataset.dashboardCard};
  });
  assert.deepEqual(downgraded,{layout:['crypto-panel','recent-transactions-panel'],first:'overview-card'});
  const preserved=await page.evaluate(()=>{
   const raw={...planTest.getState(),creditCards:[{id:'legacy-card'}],financialGoals:[{id:'legacy-goal',targetAmount:10}]};
   const next=planTest.normalizeState(raw);next.ui={...next.ui,dashboardLayouts:{mobile:['housing-panel']},selectedMonth:'2026-11'};
   const payload=planTest.preserveRestrictedRecordFormats(raw,next);
   return {cards:JSON.stringify(payload.creditCards)===JSON.stringify(raw.creditCards),goals:JSON.stringify(payload.financialGoals)===JSON.stringify(raw.financialGoals),layout:JSON.stringify(payload.ui.dashboardLayouts)===JSON.stringify(raw.ui.dashboardLayouts),month:payload.ui.selectedMonth};
  });
  assert.deepEqual(preserved,{cards:true,goals:true,layout:true,month:'2026-11'});
  for(const width of [320,759,1280]){
   await page.setViewportSize({width,height:900});await page.evaluate(()=>planTest.render());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow at ${width}`);
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: full app rendering, housing start month and payroll deductions, Free/PRO/Family cards, gross-only salary, retained layout on downgrade and mobile/desktop overflow. Isolated local fixtures.');
 }finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
