const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");

const app = fs.readFileSync("outputs/finance-pwa/app.js", "utf8");
const section = (start, end) => app.slice(app.indexOf(`  function ${start}(`), app.indexOf(`  function ${end}(`));
const saved = [];
const messages = [];
const remoteSession = { status: "ready" };
const save = vm.runInNewContext(`${section("normalizedSourceType", "sourceTypeLabel")}\n${section("saveIncomeSource", "saveWorkIncome")}\nsaveIncomeSource`, {
  remoteSession, formData: form => form, firstAccessStage: () => "income", bankAccountById: id => id === "test-bank",
  number: value => Number(value) || 0, clamp: (value, min, max) => Math.min(Math.max(value, min), max),
  showToast: message => messages.push(message), contractBreaks: value => value ? [value] : [],
  currentUserAuthor: () => ({ id: "test-user" }), salaryLegalAdditionalRate: (rate, fallback) => Number(rate) || fallback,
  upsertItem: (_collection, _id, record) => saved.push(record), sourceColors: ["#000"], userIncomeSources: () => [],
  saveState: () => {}, closeModal: () => {}, render: () => {}
});

const staleFactory = { name: "Test income", bankAccountId: "test-bank", currency: "JPY", salaryCalculationMode: "contract",
  salaryNightMethod: "fixed", salaryNightHoursWhole: "", salaryDeductionsEnabled: "on", salaryDayBreaks: "invalid" };
for (const type of ["uber", "amazon", "extra", "other"]) {
  save({ ...staleFactory, type, customType: "Employment" });
  assert.equal(saved.at(-1).type, type);
  assert.equal(saved.at(-1).salaryNightMinutesPerShift, null);
  assert.equal(saved.at(-1).salaryDeductionsEnabled, false);
  assert.equal(saved.at(-1).salaryDayBreaks, "");
  assert.equal(remoteSession.status, "income-saved");
}
assert.equal(messages.length, 0);
save({ ...staleFactory, type: "factory" });
assert.equal(saved.length, 4);
assert.match(messages.at(-1), /horas e minutos noturnos/);
save({ ...staleFactory, type: "uber", bankAccountId: "" });
assert.equal(saved.length, 4);
assert.match(messages.at(-1), /conta que recebera/);
assert.match(app, /<fieldset class="factory-source-fields/);
assert.match(app, /factoryFields\.disabled = select\.value !== "factory"/);
console.log("PASS: non-factory income ignores stale factory fields, factory validation and bank requirement remain active.");
