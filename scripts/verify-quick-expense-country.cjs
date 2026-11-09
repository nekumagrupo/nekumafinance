const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("outputs/finance-pwa/app.js", "utf8");
const section = (start, end) => app.slice(app.indexOf(`  function ${start}(`), app.indexOf(`  function ${end}(`));
const accounts = [{ id: "jp", country: "japao", bankName: "Yucho" }, { id: "br", country: "brasil", bankName: "Nubank" }];
const state = { transactions: [], ui: {} };
const messages = [];
let single = false;
const { updateQuickExpenseCountryFields: update, saveQuickExpense: save } = vm.runInNewContext([
  section("quickExpenseBankAccount", "normalizeVehicleInsurancePaymentType"),
  section("bankAccountSelectOptions", "receiptMethodLabel"), section("saveQuickExpense", "saveFamilyMember"),
  "({ updateQuickExpenseCountryFields, saveQuickExpense })"
].join("\n"), {
  state, countryMeta: { japao: { currency: "JPY", short: "JP" }, brasil: { currency: "BRL", short: "BR" } },
  activeBankAccounts: () => accounts, bankAccountById: id => accounts.find(account => account.id === id),
  bankAccountName: account => account.bankName, selectedAttr: (value, selected) => value === selected ? "selected" : "",
  escapeHtml: value => value, primaryCurrency: () => "JPY", isSingleCurrencyPlan: () => single,
  formData: data => data, showToast: message => messages.push(message), currentUserAuthor: () => ({ id: "user" }),
  uid: () => "test", number: Number, applyAutomaticClassification: entry => entry, saveState: () => {}, closeModal: () => {}, render: () => {}
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
single = true;
update({ elements });
assert.equal(elements.currency.value, "JPY");

const expense = { country: "brasil", title: "Teste", category: "Roupas", amount: "150", currency: "BRL", date: "2026-11-09", paymentMethod: "pix" };
save({ ...expense, bankAccountId: "jp" });
assert.equal(state.transactions.length, 0);
assert.match(messages.at(-1), /pais do gasto/);
save({ ...expense, bankAccountId: "br" });
assert.equal(state.transactions[0].bankAccountId, "br");
assert.equal(state.transactions[0].currency, "BRL");
console.log("PASS: Quick Expense refreshes accounts and payment methods by country, preserves Single currency, and rejects mismatched links.");
