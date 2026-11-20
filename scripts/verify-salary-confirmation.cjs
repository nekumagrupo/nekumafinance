const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const app = fs.readFileSync('outputs/finance-pwa/app.js', 'utf8');
function extract(name) {
  const start = app.indexOf('  function ' + name + '(');
  const end = app.indexOf('\n  }', start);
  assert.ok(start >= 0 && end > start, name);
  return app.slice(start, end + 4);
}
function createFixture() {
  const source = { id: 'factory', name: 'Empresa teste', type: 'factory', currency: 'JPY', bankAccountId: 'bank' };
  const state = { ui: { selectedMonth: '2026-11', hideBalance: false }, housingCards: [],
    incomeSources: [source], transactions: [], paidCommitments: {}, workIncomes: [] };
  let next = 0;
  const context = vm.createContext({ state, console, salaryUtilityKeys: ['electricity','gas','water','internet'],
    housingItemTemplates: [{ key:'rent',label:'Aluguel' },{ key:'electricity',label:'Luz' },{ key:'gas',label:'Gas' },
      { key:'water',label:'Agua' },{ key:'internet',label:'Internet' },{ key:'parking',label:'Estacionamento' }],
    housingPaymentMethodMeta: { bank:'Conta/debito',company:'Desconto pela empresa' }, PRIMARY_CURRENCY:'JPY',
    primaryCurrency: () => 'JPY', currentMonth: () => '2026-11', formatShortDate: String, uid: prefix => prefix + (++next),
    sanitizeCurrency: (value, fallback) => ['JPY','BRL','USD','EUR'].includes(value) ? value : fallback,
    hasCommercialFeature: () => true, activeIncomeSourceById: () => true,
    bankAccountById: id => id === 'bank' ? { id:'bank',country:'japao',currency:'JPY' } : null,
    incomeSourceById: () => source, familyDashboardMemberModel: () => ({ currentKey:'owner' }),
    currentUserAuthor: () => ({ id:'owner',name:'Teste' }), latestRate: () => 1,
    convert: (amount, from, to) => from === to ? amount : amount * 150,
    formatMoney: (value, currency) => `${currency} ${Number(value).toFixed(0)}`,
    formatMoneyWithPrimary: (value, currency) => `${currency} ${Number(value).toFixed(0)}`,
    escapeHtml: String, escapeAttr: String, selectedAttr: (value, expected) => value === expected ? 'selected' : '',
    formData: form => form, saveState() {}, render() {}, closeModal() {}, showToast(text) { context.notice = text; },
    renderPlanLock: () => '<p>PRO</p>',
    factorySources: () => [source], estimateFactorySourceSalary: () => ({ configured:true,currency:'JPY',total:400000 }),
    salaryBonusesForMonth: () => [], factorySalaryDueDate: () => '2026-11-15', isDateReached: () => true,
    monthPlannedWorkIncomes: () => [], salaryReceiptTargetFromRef: () => context.target,
    estimateSalaryDeductions: () => context.target.deductionEstimate
  });
  context.target = { kind:'factory',id:'factory',sourceId:'factory',title:'Empresa teste',currency:'JPY',
    grossAmount:400000,netAmount:390000,month:'2026-10',paymentMonth:'2026-11',
    deductionEstimate:{ configured:true,total:10000,net:390000,entries:[{ key:'income-tax',label:'Imposto',amount:10000 }] } };
  const functions = ['number','round','clamp','addMonths','salaryPaymentKey','salaryPaymentStatusLabel',
    'normalizeHousingPayrollMonths','normalizeHousingItems','housingItemForMonth','housingItemOccursInMonth',
    'housingPaymentKey','isHousingItemPaid','housingCardMonthRows','housingItemByKey',
    'salaryUtilityHousingCards','preferredSalaryHousingId','renderSalaryUtilityFields','prepareSalaryUtilities',
    'saveSalaryReceipt','recordSalaryDeductionTransactions','dashboardSalaryCards','salaryCardDisplayAmount',
    'renderWorkspaceSalaryMetric','renderWorkspaceSalaryPopover','renderSalaryFormula','renderSalaryDetailsModal'];
  vm.runInContext(functions.map(extract).join('\n'), context);
  context.housingItemDateForMonth = () => '2026-11-15';
  context.renderSalaryPredictionDetails = () => '<details class="salary-breakdown"><summary>Detalhamento</summary><dl><dt>Horas extras</dt><dd>JPY 20000</dd></dl></details>';
  const data = { receiptRef:'factory:factory:2026-10:2026-11',amount:'378000',currency:'JPY',date:'2026-11-15',
    bankAccountId:'bank',salaryHousingCardId:'',salaryUtility_electricity:'3000',salaryUtility_gas:'4000',salaryUtility_water:'2000',salaryUtility_internet:'3000' };
  return { context, state, source, data };
}
function run() {
  let { context:c, state:s, data } = createFixture();
  const before = JSON.stringify(s);
  const plan = c.prepareSalaryUtilities({ target:c.target,source:s.incomeSources[0],data,date:data.date,currency:'JPY',author:{id:'owner'},now:'2026-11-20T00:00:00Z' });
  assert.equal(JSON.stringify(s),before, 'Planning must not mutate financial state');
  assert.equal(plan.deductions.total,22000); assert.equal(plan.deductions.net,378000);
  c.saveSalaryReceipt(data);
  assert.equal(s.housingCards.length,1);
  assert.equal(s.transactions.length,6);
  assert.equal(s.paidCommitments['2026-10:salary:factory'].amount,378000);
  assert.equal(s.transactions.find(t=>t.type==='income').bankAmount,378000);
  assert.ok(s.transactions.filter(t=>t.type==='expense').every(t=>t.affectsBankBalance===false));
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-11').length,4);
  assert.ok(c.housingCardMonthRows(s.housingCards[0],'2026-11').every(row=>row.paid && row.paymentMethod==='company'));
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-10').length,0);
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-12').length,0);
  const normalized = c.normalizeHousingItems(JSON.parse(JSON.stringify(s.housingCards[0].items)),'JPY');
  assert.equal(normalized.find(item=>item.key==='electricity').payrollMonths['2026-11'].amount,3000);
  const firstSave = JSON.stringify(s); c.saveSalaryReceipt(data); assert.equal(JSON.stringify(s),firstSave);
  let cards = c.dashboardSalaryCards('2026-11');
  assert.equal(cards[0].hasConfirmedReceipt,true); assert.equal(cards[0].receivedAmount,378000);
  assert.equal(c.dashboardSalaryCards('2026-12')[0].hasConfirmedReceipt,false);
  let metric = c.renderWorkspaceSalaryMetric(cards,false);
  assert.match(metric,/Salario recebido/); assert.match(metric,/<strong>JPY 378000<\/strong>/);
  assert.match(metric,/data-modal="salaryDetails"/);
  assert.match(c.renderSalaryDetailsModal(),/Horas extras/);
  assert.match(c.renderSalaryDetailsModal(),/Liquido recebido/);
  assert.match(c.renderSalaryFormula(cards[0],false),/JPY 378000/);
  assert.doesNotMatch(c.renderWorkspaceSalaryMetric(cards,true),/378000|390000/);
  cards.push({ kind:'factory',amount:100000,netAmount:90000,currency:'JPY',paid:false });
  assert.match(c.renderWorkspaceSalaryMetric(cards,false),/<strong>JPY 378000<\/strong>/, 'Pending salary must not inflate received total');
  const foreign = { ...cards[0],receivedAmount:100,receivedCurrency:'USD' };
  assert.match(c.renderWorkspaceSalaryMetric([foreign],false),/<strong>JPY 15000<\/strong>/);
  c.hasCommercialFeature=()=>false;
  assert.match(c.renderWorkspaceSalaryMetric(cards,false),/Salario previsto/);
  assert.doesNotMatch(c.renderWorkspaceSalaryMetric(cards,false),/salaryDetails|378000/);
  assert.equal(c.renderSalaryDetailsModal(),'<p>PRO</p>');

  ({ context:c,state:s,data }=createFixture());
  for (const key of c.salaryUtilityKeys) data['salaryUtility_'+key]='0';
  data.amount='390000'; c.saveSalaryReceipt(data);
  assert.equal(s.housingCards.length,0); assert.equal(s.transactions.length,2);

  ({ context:c,state:s,data }=createFixture());
  s.housingCards=[{id:'home',name:'Casa',country:'japao',currency:'JPY',active:true,items:[
    {key:'electricity',label:'Luz',amount:2500,currency:'JPY',recurring:true,startMonth:'2026-01',paymentMethod:'bank',bankAccountId:'bank'}]}];
  data.salaryHousingCardId='home'; c.saveSalaryReceipt(data);
  assert.equal(s.housingCards.length,1);
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-11').find(row=>row.key==='electricity').amount,3000);
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-10').find(row=>row.key==='electricity').amount,2500);
  assert.equal(c.housingCardMonthRows(s.housingCards[0],'2026-12').find(row=>row.key==='electricity').paymentMethod,'bank');

  for (const invalid of ['-1','Infinity','bad','1.5']) {
    ({ context:c,state:s,data }=createFixture()); data.salaryUtility_water=invalid;
    const snapshot=JSON.stringify(s); c.saveSalaryReceipt(data); assert.equal(JSON.stringify(s),snapshot);
  }
  ({ context:c,state:s,data }=createFixture());
  data.salaryHousingCardId='missing'; c.saveSalaryReceipt(data); assert.equal(s.transactions.length,0);
  ({ context:c,state:s,data }=createFixture());
  s.housingCards=[{id:'home',name:'Casa',country:'japao',currency:'JPY',active:true,items:[]}];
  s.paidCommitments['2026-11:housing:home:electricity']={paymentMethod:'bank'};
  data.salaryHousingCardId='home'; const paidSnapshot=JSON.stringify(s); c.saveSalaryReceipt(data); assert.equal(JSON.stringify(s),paidSnapshot);
  assert.doesNotMatch(extract('renderSalaryDeductionFields'),/input\('salaryHousingDeduction'|input\('salaryParkingDeduction'/);
  assert.match(extract('saveIncomeSource'),/previousSource\?\.salaryHousingDeduction/);
  assert.match(extract('saveHousingCard'),/payrollMonths: previousItems/);
  console.log('PASS: confirmed salary totals, full details/PRO/privacy, monthly housing payroll, optional zero bills, no double bank debit, persistence, duplicate and invalid-input guards; legacy rent preserved. Isolated app functions.');
}
module.exports = { createFixture };
if (require.main === module) run();
