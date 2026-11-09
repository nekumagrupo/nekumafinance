const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("outputs/finance-pwa/app.js", "utf8");
const currencies = app.slice(app.indexOf("  const supportedCurrencies"), app.indexOf("  const operationCurrencies"));
const helpers = app.slice(app.indexOf("  function primaryCurrency()"), app.indexOf("  function maybePromptSecondaryCurrency()"));
const sanitizer = app.slice(app.indexOf("  function sanitizeCurrency("), app.indexOf("  function sanitizeColor("));
const secondary = app.slice(app.indexOf("  function sanitizeSecondaryCurrency("), app.indexOf("  function currencyOptions("));
const formatter = app.slice(app.indexOf("  function formatMoneyWithPrimary("), app.indexOf("  function maskedMoney("));
const salary = app.slice(app.indexOf("  function renderSalaryTotalConverted("), app.indexOf("  function dashboardSalaryCards("));
const subscriptions = app.match(/  function subscriptionMonthTotalLabel\([^\n]+\n[^\n]+\n  }/)[0];
const wise = app.match(/  function renderWise\(\) \{[\s\S]+?\n  }/)[0];
const state = { ui: { selectedMonth: "2026-11" }, settings: { baseCurrency: "BRL", secondaryCurrency: "JPY" } };
let plan = "free";
let conversions = 0;
const context = vm.createContext({ state, remoteStore: { enabled: true }, commercialSnapshot: () => ({ plan }),
  latestRate: () => 0.04, convert: () => { conversions++; return 250; }, PRIMARY_CURRENCY: "JPY", DEFAULT_SECONDARY_CURRENCY: "BRL",
  subscriptionMonthTotal: () => 10, isSingleCurrencyPlan: () => plan === "free" });
const { visibleSecondaryCurrency: visible, setSecondaryCurrencyPreference: set, formatMoneyWithPrimary: format,
  renderSalaryTotalConverted: salaryComparison, subscriptionMonthTotalLabel: subscriptionLabel, renderWise } = vm.runInContext(
  `${currencies}\n${helpers}\n${sanitizer}\n${secondary}\n${formatter}\n${salary}\n${subscriptions}\n${wise}\n({ visibleSecondaryCurrency, setSecondaryCurrencyPreference, formatMoneyWithPrimary, renderSalaryTotalConverted, subscriptionMonthTotalLabel, renderWise })`, context);

assert.equal(visible(), "");
assert.doesNotMatch(format(10, "BRL"), /money-converted/);
assert.doesNotMatch(format(100, "JPY"), /money-converted/);
assert.equal(salaryComparison(10, "BRL"), "");
assert.doesNotMatch(subscriptionLabel(), /money-converted/);
assert.equal(renderWise(), "");
assert.equal(conversions, 0, "Free never computes a comparative amount");
plan = "pro";
assert.equal(visible(), "JPY", "Existing PRO keeps its previous preference");
state.settings.operationCountry = "brasil";
assert.equal(visible(), "", "New PRO waits for a choice");
set("BRL");
assert.equal(visible(), "", "Primary cannot also be the secondary");
set("JPY");
assert.equal(visible(), "JPY");
assert.match(format(10, "BRL"), /money-converted/);
assert.equal(conversions, 1);
plan = "free";
assert.equal(visible(), "");
assert.equal(state.settings.secondaryCurrency, "JPY", "Downgrade does not erase the preference");
assert.equal(state.settings.baseCurrency, "BRL");
plan = "pro";
assert.equal(visible(), "JPY", "Returning to PRO restores the comparison");
assert.match(salaryComparison(10, "BRL"), /[¥￥]/);
assert.match(subscriptionLabel(), /money-converted/);
set("");
assert.equal(visible(), "");
assert.equal(state.settings.secondaryCurrency, "JPY", "Skipping never rewrites the underlying currency");
console.log("PASS: Free hides conversions, PRO opts in, primary remains unchanged, and downgrade preserves the secondary preference.");
