import test from "node:test";
import assert from "node:assert/strict";
import { computeEarning, creatorCap, depositAmount, effectiveCpm, expectedViews, formatSar, parseSar } from "./money";

test("parse / format", () => {
  assert.equal(parseSar("12.5"), 1250);
  assert.equal(parseSar("١٬٢٠٠"), 120000);
  assert.equal(parseSar("abc"), null);
  assert.equal(parseSar("-5"), null);
  assert.equal(formatSar(125000), "1,250");
  assert.equal(formatSar(125050), "1,250.50");
});

test("calculator", () => {
  // 3000 ريال ÷ 15 ريال للألف = 200,000 مشاهدة
  assert.equal(expectedViews(300000, 1500), 200000);
  assert.equal(depositAmount(300000, 20), 60000);
  assert.equal(creatorCap(300000, 3), 100000);
});

test("earning under the cap", () => {
  // 40,000 مشاهدة × 15 ريال = 600 ريال، عمولة 15% = 90، الصافي 510
  assert.deepEqual(computeEarning(40000, 1500, 100000, 15), { gross: 60000, commission: 9000, net: 51000, capped: false });
});

test("earning never exceeds the creator's share of the budget", () => {
  const e = computeEarning(500000, 1500, 100000, 15);
  assert.equal(e.gross, 100000);
  assert.equal(e.net, 85000);
  assert.equal(e.capped, true);
});

test("effective cpm", () => {
  assert.equal(effectiveCpm(100000, 500000), 200); // 2 ريال للألف بعد تجاوز السقف
  assert.equal(effectiveCpm(0, 0), null);
});
