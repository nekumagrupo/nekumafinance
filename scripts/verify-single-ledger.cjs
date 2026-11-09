const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const source = fs.readFileSync("outputs/finance-pwa/app.js", "utf8");
const section = (start, end) => source.slice(source.indexOf(`  function ${start}(`), source.indexOf(`  function ${end}(`));
const month = "2026-11";
const bank = { id: "br", currency: "BRL", initialBalance: 100, balanceDate: `${month}-01` };
const yenBank = { id: "jp", currency: "JPY", initialBalance: 20000 };
const tx = (id, currency, amount) => ({ id, currency, amount, bankAccountId: bank.id, date: `${month}-09`, type: "expense" });
const state = { ui: { selectedMonth: month }, bankAccounts: [yenBank, bank], transactions: [tx("br-expense", "BRL", 15), tx("jp-expense", "JPY", 500)], transfers: [{ date: `${month}-09`, feeAmount: 100 }], workIncomes: [], paidCommitments: {} };
const original = JSON.stringify(state);
let plan = "free";
const empty = () => [];
const context = vm.createContext({ state, commercialSnapshot: () => ({ plan }), primaryCurrency: () => "BRL", latestRate: () => 0.04,
  sanitizeCurrency: (code, fallback) => code || fallback, countryMeta: {}, number: Number,
  sum: (items, key) => items.reduce((total, item) => total + item[key], 0), clamp: (n, min, max) => Math.max(min, Math.min(max, n)),
  outflowTypes: ["expense"], allOutflowTypes: ["expense"], convert: (n, from, to) => from === to ? n : n * 0.04,
  round: n => n, currentMonth: () => month, dateInMonth: (m, d) => `${m}-${String(d).padStart(2, "0")}`, showToast: () => {},
  cardPurchaseExpenseEntries: empty, plannedCommitmentEntries: empty, plannedCardBillEntries: empty, plannedDebtEntries: empty,
  plannedSubscriptionEntries: empty, autoPaidSubscriptionEntries: empty, plannedHousingEntries: empty, vehicleMonthlyCosts: empty,
  userWorkIncomes: empty, manualCardBill: () => 2,
  cardPurchaseRowsForCard: () => [{ rawCurrency: "BRL", rawAmount: 10 }, { rawCurrency: "JPY", rawAmount: 100 }] });
const app = vm.runInContext([
  section("isSingleCurrencyPlan", "preserveRestrictedRecordFormats"), section("summarizeMonth", "projectedSalaryForMonth"),
  section("bankAccountBalance", "bankAccountMonthlyActivity"), section("creditCardMonthBill", "manualCardBill"),
  "({ summarizeMonth, monthTransactions, planVisibleRecords, bankAccountBalance, creditCardMonthBill, guardSingleCurrencyForm })"
].join("\n"), context);

assert.deepEqual(Array.from(app.monthTransactions(month, "global"), row => row.id), ["br-expense"]);
assert.equal(app.planVisibleRecords(state.bankAccounts)[0].id, "br", "Select the first account in the primary currency, not the first foreign account");
assert.equal(app.bankAccountBalance(bank), 85);
assert.equal(app.summarizeMonth(month, "global").actualOutflow, 15);
assert.equal(app.creditCardMonthBill(bank, month, { visibleOnly: true }).total, 12);
assert.equal(app.creditCardMonthBill(bank, month).total, 16, "Payment calculations retain the complete invoice");
assert.equal(app.guardSingleCurrencyForm("transaction", { currency: "BRL" }), true);
assert.equal(app.guardSingleCurrencyForm("transaction", { currency: "JPY" }), false);
assert.equal(app.guardSingleCurrencyForm("crypto", { costCurrency: "BRL", feeCurrency: "JPY" }), false);
assert.equal(app.guardSingleCurrencyForm("transfer"), false);
plan = "pro";
assert.equal(app.guardSingleCurrencyForm("transaction", { currency: "JPY" }), true);
assert.equal(app.monthTransactions(month, "global").length, 2);
assert.equal(app.bankAccountBalance(bank), 65);
assert.equal(app.summarizeMonth(month, "global").actualOutflow, 39);
assert.equal(app.creditCardMonthBill(bank, month, { visibleOnly: true }).total, 16);
assert.equal(JSON.stringify(state), original, "Downgrade and upgrade never mutate financial records");
console.log("PASS: Single filters ledger, balances, summaries and invoice previews; PRO and payment math retain the original records.");
