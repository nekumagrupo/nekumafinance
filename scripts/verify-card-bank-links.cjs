const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('outputs/finance-pwa/app.js','utf8');
function extract(name) {
  const start=source.indexOf(`  function ${name}(`);
  assert.ok(start>=0,name);
  const end=source.indexOf('\n  function ',start+1);
  return source.slice(start,end);
}
const accounts=[{id:'jp-1',country:'japao',bankName:'JP Bank',nickname:'Salary'}, {id:'jp-2',country:'japao',bankName:'Second Bank',nickname:'Savings'}, {id:'br-1',country:'brasil',bankName:'BR Bank',nickname:'Brazil'}, {id:'inactive',country:'japao',active:false}];
const cards={}; let data; let rejected=false;
const context=vm.createContext({
  state:{ui:{selectedMonth:'2026-10'}},
  activeBankAccounts:()=>accounts.filter(a=>a.active!==false),
  bankAccountById:id=>accounts.find(a=>a.id===id),
  bankAccountName:a=>a.nickname, escapeHtml:s=>String(s), selectedAttr:(a,b)=>a===b?'selected':'',
  countryMeta:{japao:{short:'JP'},brasil:{short:'BR'}},
  formData:()=>data,normalizeCardPaymentMethod:s=>s,
  showToast:()=>{rejected=true;},sanitizeColor:s=>s,number:Number,clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
  upsertItem:(type,id,value)=>{cards[id]=value;return true;},saveState:()=>{},closeModal:()=>{},render:()=>{}
});
vm.runInContext(extract('bankAccountSelectOptions')+'\n'+extract('saveCreditCard'),context);
const options=vm.runInContext('bankAccountSelectOptions("global","jp-2")',context);
for(const id of ['jp-1','jp-2','br-1']) assert.ok(options.includes(`value="${id}"`));
assert.ok(!options.includes('value="inactive"'));
assert.match(options,/value="jp-2" selected/);
assert.match(extract('renderCreditCardModal'),/bankAccountSelectOptions\("global", item\?\.bankAccountId/);
function save(id,bankAccountId) {
  data={id,bankAccountId,paymentMethod:'bank',country:'japao',issuer:'Issuer',nickname:id,currency:'JPY'};
  vm.runInContext('saveCreditCard({})',context);
}
save('card1','jp-1'); save('card2','jp-2'); save('card3','br-1');
assert.equal(cards.card1.bankAccountId,'jp-1');
assert.equal(cards.card2.bankAccountId,'jp-2');
assert.equal(cards.card3.bankAccountId,'br-1');
save('card2','jp-1');
assert.equal(cards.card1.bankAccountId,'jp-1');
assert.equal(cards.card3.bankAccountId,'br-1');
save('invalid','missing'); save('disabled','inactive');
assert.equal(cards.invalid,undefined); assert.equal(cards.disabled,undefined);
console.log('PASS: all active bank options, selected account retained, independent card links and invalid/inactive account rejection. VM regression tests.');
