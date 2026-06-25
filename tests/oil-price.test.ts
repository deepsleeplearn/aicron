import assert from "node:assert/strict";
import test from "node:test";

import { extractOilAdjustment, extractShanghaiOilPrices, msUntilNextOilPriceFetch } from "../src/lib/oil-price";

test("extractShanghaiOilPrices reads Shanghai 92/95/98 values", () => {
  const html = `
    <div id="youjia">
      <dl><dt>上海92#汽油</dt><dd>7.90</dd></dl>
      <dl><dt>上海95#汽油</dt><dd>8.41</dd></dl>
      <dl><dt>上海98#汽油</dt><dd>10.41</dd></dl>
      <dl><dt>上海0#柴油</dt><dd>7.59</dd></dl>
    </div>
  `;

  assert.deepEqual(extractShanghaiOilPrices(html), {
    "92#": "7.90",
    "95#": "8.41",
    "98#": "10.41"
  });
});

test("extractOilAdjustment reads latest down adjustment range", () => {
  const html = `
    <meta name="Description" content="今日95号汽油是2026年6月18日24时，下调95汽油515元/吨(0.43元/升-0.45元/升)后的价格，新一次95汽油价格调整将在2026年7月3日24时进行。">
  `;

  assert.deepEqual(extractOilAdjustment(html), {
    delta: "-0.43~0.45",
    tone: "down",
    updatedAt: "2026年6月18日24时"
  });
});

test("extractOilAdjustment handles suspended adjustment", () => {
  const html = `<div id="cont">今日92号汽油是2026年5月29日24时，搁浅调整后的价格</div>`;

  assert.deepEqual(extractOilAdjustment(html), {
    delta: "0",
    tone: "flat",
    updatedAt: "2026年5月29日24时"
  });
});

test("oil price cache expires at the next local 7 AM slot", () => {
  assert.equal(msUntilNextOilPriceFetch(new Date("2026-06-20T06:30:00+08:00")), 30 * 60 * 1000);
  assert.equal(msUntilNextOilPriceFetch(new Date("2026-06-20T07:00:00+08:00")), 24 * 60 * 60 * 1000);
  assert.equal(msUntilNextOilPriceFetch(new Date("2026-06-20T08:15:00+08:00")), 22 * 60 * 60 * 1000 + 45 * 60 * 1000);
});
