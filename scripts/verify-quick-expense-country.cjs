const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("outputs/finance-pwa/app.js", "utf8");
const startOf = name => app.search(new RegExp(`^  (?:async )?function ${name}\\(`, "m"));
const section = (start, end) => app.slice(startOf(start), startOf(end));
const accounts = [{ id: "jp", country: "japao", bankName: "Yucho" }, { id: "br", country: "brasil", bankName: "Nubank" }];
const state = { transactions: [], ui: { activeCountry: "brasil" }, settings: { operationCountry: "japao" } };
const messages = [];
let single = false;
let primary = "JPY";
let dashboardAccount = accounts[1];
const remoteStore = { enabled: false };
const remoteSession = { user: { id: "user" }, householdId: "test-home" };
let flush = async () => {};
const { updateQuickExpenseCountryFields: update, saveQuickExpense: save, renderQuickExpenseModal: renderExpense, restorePendingQuickExpenses: restore, writeRemoteState: write } = vm.runInNewContext([
  section("quickExpenseSingleCountry", "normalizeVehicleInsurancePaymentType"),
  section("bankAccountSelectOptions", "receiptMethodLabel"), section("saveQuickExpense", "saveFamilyMember"),
  section("countrySelect", "saveTransaction"), section("renderQuickExpenseModal", "renderFamilyMemberModal"),
  section("restorePendingQuickExpenses", "pendingFirstAccessBank"),
  section("writeRemoteState", "syncRemoteNow"),
  "({ updateQuickExpenseCountryFields, saveQuickExpense, renderQuickExpenseModal, restorePendingQuickExpenses, writeRemoteState })"
].join("\n"), {
  state, countryMeta: { japao: { label: "Japao", currency: "JPY", short: "JP" }, brasil: { label: "Brasil", currency: "BRL", short: "BR" } },
  activeBankAccounts: () => accounts, bankAccountById: id => accounts.find(account => account.id === id),
  selectedDashboardAccount: () => dashboardAccount, quickExpenseCategories: [], hasFamilyAccess: () => false,
  currencyOptions: code => `<option value="${code}">${code}</option>`, dateInMonth: () => "2026-11-09", escapeAttr: value => value,
  bankAccountName: account => account.bankName, selectedAttr: (value, selected) => value === selected ? "selected" : "",
  escapeHtml: value => value, primaryCurrency: () => primary, isSingleCurrencyPlan: () => single,
  formData: data => data, showToast: message => messages.push(message), currentUserAuthor: () => ({ id: "user" }),
  uid: () => "test", number: Number, applyAutomaticClassification: entry => entry, saveState: () => {}, closeModal: () => {}, render: () => {},
  remoteStore, remoteSession, stateGeneration: 0, flushRemoteState: () => flush(), renderKeepingScroll: () => {},
  remoteSaveTimer: null, clearTimeout, hasHouseholdPermission: () => true, resetTime: () => 0,
  preserveRestrictedRecordFormats: (raw, next) => next, withCurrentWorkOwner: value => value, persistLocalState: () => {}
});

const elements = { country: { value: "brasil" }, currency: { value: "JPY" }, bankAccountId: { value: "jp" }, paymentMethod: { value: "transfer" } };
update({ elements });
assert.match(elements.bankAccountId.innerHTML, /Nubank/);
assert.doesNotMatch(elements.bankAccountId.innerHTML, /Yucho/);
assert.equal(elements.bankAccountId.value, "");
assert.match(elements.paymentMethod.innerHTML, /Pix/);
assert.match(elements.paymentMethod.innerHTML, /value="bank" selected/);
assert.equal(elements.currency.value, "BRL");
elements.bankAccountId.value = "br";
update({ elements });
assert.match(elements.bankAccountId.innerHTML, /value="br" selected/);
const countryOptions = () => renderExpense().match(/<select id="country" name="country">([\s\S]*?)<\/select>/)[1];
assert.match(countryOptions(), /value="brasil"/);
assert.match(countryOptions(), /value="japao"/);
single = true;
assert.match(countryOptions(), /value="japao"/);
assert.doesNotMatch(countryOptions(), /brasil/);
assert.match(renderExpense(), /Yucho/);
assert.doesNotMatch(renderExpense(), /Nubank/);
update({ elements });
assert.equal(elements.country.value, "japao");
assert.equal(elements.bankAccountId.value, "");
assert.doesNotMatch(elements.paymentMethod.innerHTML, /Pix/);
assert.equal(elements.currency.value, "JPY");

const expense = { country: "brasil", title: "Teste", category: "Roupas", amount: "150", currency: "BRL", date: "2026-11-09", paymentMethod: "pix" };
save({ ...expense, currency: "JPY", bankAccountId: "" });
assert.equal(state.transactions.length, 0);
assert.match(messages.at(-1), /pais de operacao/);
save({ ...expense, country: "japao", currency: "JPY", bankAccountId: "jp" });
assert.equal(state.transactions.pop().bankAccountId, "jp");
state.settings.operationCountry = "brasil";
state.ui.activeCountry = "japao";
primary = "BRL";
assert.match(countryOptions(), /value="brasil"/);
assert.doesNotMatch(countryOptions(), /japao/);
assert.match(renderExpense(), /Nubank/);
state.settings.operationCountry = "other";
primary = "USD";
dashboardAccount = accounts[0];
assert.match(countryOptions(), /Outro pais/);
assert.match(renderExpense(), /value="USD"/);
state.settings.operationCountry = "";
dashboardAccount = null;
primary = "BRL";
assert.match(countryOptions(), /value="brasil"/);
single = false;
save({ ...expense, bankAccountId: "jp" });
assert.equal(state.transactions.length, 0);
assert.match(messages.at(-1), /pais do gasto/);
save({ ...expense, bankAccountId: "br" });
assert.equal(state.transactions[0].bankAccountId, "br");
assert.equal(state.transactions[0].currency, "BRL");
console.log("PASS: Quick Expense locks Single to the operating country, rejects stale submissions, and preserves PRO country switching and account links.");

(async () => {
  remoteStore.enabled = true;
  state.transactions = [];
  let rejectWrite;
  flush = () => new Promise((resolve, reject) => { rejectWrite = reject; });
  const saving = save({ ...expense, bankAccountId: "br" });
  assert.equal(messages.at(-1), "Sincronizando gasto...");
  assert.equal(state.ui.pendingQuickExpenseIds[0], "test");
  rejectWrite(new Error("Network unavailable"));
  await saving;
  assert.match(messages.at(-1), /Sincronizacao pendente/);
  const local = JSON.parse(JSON.stringify(state));
  const unrelated = { id: "unmarked", quickExpense: true };
  local.transactions.push(unrelated);
  assert.equal(restore([], local).transactions.length, 1);
  assert.equal(restore([], local).transactions[0].id, "test");
  assert.equal(restore([local.transactions[0]], local).ids.length, 0);
  assert.equal(restore([], local, { test: "2026-11-09" }).transactions.length, 0);
  state.transactions = [];
  let saved;
  remoteStore.client = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { state: {} } }) }) }) }),
    rpc: async (name, payload) => { assert.equal(name, "save_app_state"); saved = payload.app_state; return { data: "2026-11-09T00:00:00Z" }; }
  };
  flush = write;
  await save({ ...expense, bankAccountId: "br" });
  assert.equal(saved.transactions[0].id, "test");
  assert.equal(Object.hasOwn(saved.ui, "pendingQuickExpenseIds"), false);
  assert.equal(state.ui.pendingQuickExpenseIds.length, 0);
  assert.equal(messages.at(-1), "Gasto rapido salvo na nuvem.");
  console.log("PASS: Quick Expense waits for acknowledgement, retains only pending entries after reload, and avoids duplicates.");
})().catch(error => { console.error(error); process.exitCode = 1; });
