import assert from "node:assert/strict";
import test from "node:test";

import {
  formatArticleDate,
  formatItemDateLabel,
  isCurrentLocalItemDate,
  itemDisplayTimestamp,
  itemSortTimestamp
} from "../src/lib/date-format";

test("formatArticleDate does not invent time for date-only values", () => {
  assert.equal(formatArticleDate("2026-06-09"), "2026/06/09");
  assert.equal(formatArticleDate("Jun 11, 2026"), "2026/06/11");
  assert.equal(formatArticleDate("June 15, 2026"), "2026/06/15");
  assert.equal(formatArticleDate("2026-06-18T00:00:00.000Z"), "2026/06/18");
  assert.equal(formatArticleDate("2025"), "2025");
});

test("formatArticleDate keeps real time when the source provides time", () => {
  assert.match(formatArticleDate("2026-06-16T10:00:00+08:00"), /^2026\/06\/16 .*10:00$/);
  assert.match(formatArticleDate("2026-06-18T09:00:00.000Z"), /^2026\/06\/18 .*\d{2}:\d{2}$/);
});

test("itemDisplayTimestamp sorts date-only values by day without requiring a mocked time", () => {
  assert.ok(itemDisplayTimestamp("2026-06-18") > itemDisplayTimestamp("2026-06-17"));
  assert.ok(itemDisplayTimestamp("June 15, 2026") > itemDisplayTimestamp("June 14, 2026"));
  assert.ok(itemDisplayTimestamp("2026") > itemDisplayTimestamp("2025"));
});

test("item sort timestamp prefers submit time over publish time", () => {
  assert.equal(
    itemSortTimestamp({
      submittedAt: "2026-06-22",
      publishedAt: "2026-12-28T20:54:00+08:00",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    itemDisplayTimestamp("2026-06-22")
  );
  assert.equal(
    itemSortTimestamp({
      submittedAt: null,
      publishedAt: "2026-12-28T20:54:00+08:00",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    itemDisplayTimestamp("2026-12-28T20:54:00+08:00")
  );
});

test("format item date label hides unknown submit or publish times", () => {
  assert.equal(
    formatItemDateLabel({
      sourceId: "huggingface-daily-papers",
      submittedAt: null,
      publishedAt: "2026-12-28T20:54:00+08:00",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    "publish 2026/12/28 20:54"
  );
  assert.equal(
    formatItemDateLabel({
      sourceId: "huggingface-daily-papers",
      submittedAt: "2026-06-22",
      publishedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    "submit 2026/06/22"
  );
  assert.equal(
    formatItemDateLabel({
      sourceId: "huggingface-daily-papers",
      submittedAt: "2026-06-22",
      publishedAt: "2026-12-28T20:54:00+08:00",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    "submit 2026/06/22 · publish 2026/12/28 20:54"
  );
  assert.equal(
    formatItemDateLabel({
      sourceId: "cmu-ml-blog",
      submittedAt: null,
      publishedAt: "June 15, 2026",
      createdAt: "2026-01-01T00:00:00.000Z"
    }),
    "2026/06/15"
  );
});

test("detects whether an item date is today using the same date priority as sorting", () => {
  const today = new Date("2026-06-23T12:00:00+08:00");

  assert.equal(
    isCurrentLocalItemDate(
      {
        submittedAt: "2026-06-23T09:30:00+08:00",
        publishedAt: "2026-06-22T10:00:00+08:00",
        createdAt: "2026-06-22T08:00:00+08:00"
      },
      today
    ),
    true
  );
  assert.equal(
    isCurrentLocalItemDate(
      {
        submittedAt: null,
        publishedAt: "2026-06-23",
        createdAt: "2026-06-22T08:00:00+08:00"
      },
      today
    ),
    true
  );
  assert.equal(
    isCurrentLocalItemDate(
      {
        submittedAt: "2026-06-22",
        publishedAt: "2026-06-23T10:00:00+08:00",
        createdAt: "2026-06-23T10:00:00+08:00"
      },
      today
    ),
    false
  );
});
