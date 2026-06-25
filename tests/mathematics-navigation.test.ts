import assert from "node:assert/strict";
import test from "node:test";

import { getAggregateNavScope } from "../src/lib/nav-aggregation";
import { PLAZA_SOURCE_IDS } from "../src/lib/plaza";
import { DEFAULT_SOURCES } from "../src/lib/sources";
import { readFileSync } from "node:fs";

const EXPECTED_MATH_SOURCE_IDS = [
  "optimization-online",
  "mathprog-journal",
  "siam-optimization",
  "informs-mor",
  "jmlr-papers",
  "pmlr-colt",
  "pmlr-alt",
  "pmlr-aistats",
  "pmlr-uai",
  "statistics-computing",
  "siam-sisc",
  "siam-sinum",
  "siam-mds"
];

test("Mathematics sources are configured as crawlable research sources", () => {
  const sources = new Map(DEFAULT_SOURCES.map((source) => [source.id, source]));

  for (const sourceId of EXPECTED_MATH_SOURCE_IDS) {
    const source = sources.get(sourceId);
    assert.ok(source, `${sourceId} should exist`);
    assert.equal(source?.category, "research");
    assert.equal(source?.enabled, true);
    assert.equal(PLAZA_SOURCE_IDS.has(sourceId), true, `${sourceId} should appear in Plaza`);
  }

  assert.equal(sources.get("optimization-online")?.type, "optimization-online");
  assert.equal(sources.get("jmlr-papers")?.type, "jmlr-papers");
  assert.equal(sources.get("pmlr-colt")?.type, "pmlr-proceedings");
  assert.equal(sources.get("siam-optimization")?.type, "academic-toc");
});

test("Mathematics aggregate scopes expose the requested second-level navigation groups", () => {
  assert.deepEqual(
    getAggregateNavScope("mathematics")?.leafGroups.map((group) => group.id),
    EXPECTED_MATH_SOURCE_IDS
  );

  assert.deepEqual(
    getAggregateNavScope("mathematics:optimization")?.leafGroups.map((group) => group.id),
    ["optimization-online", "mathprog-journal", "siam-optimization", "informs-mor"]
  );
  assert.deepEqual(
    getAggregateNavScope("mathematics:learning-theory")?.leafGroups.map((group) => group.id),
    ["jmlr-papers", "pmlr-colt", "pmlr-alt"]
  );
  assert.deepEqual(
    getAggregateNavScope("mathematics:statistics")?.leafGroups.map((group) => group.id),
    ["pmlr-aistats", "pmlr-uai", "statistics-computing"]
  );
  assert.deepEqual(
    getAggregateNavScope("mathematics:applied-math")?.leafGroups.map((group) => group.id),
    ["siam-sisc", "siam-sinum", "siam-mds"]
  );
});

test("Mathematics sources are wired into fetcher and dashboard navigation", () => {
  const fetcherSource = readFileSync("src/lib/fetcher.ts", "utf8");
  const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
  const apiSource = readFileSync("src/app/api/items/route.ts", "utf8");

  assert.match(fetcherSource, /fetchOptimizationOnlineItems/);
  assert.match(fetcherSource, /source\.type === "jmlr-papers"/);
  assert.match(fetcherSource, /source\.type === "pmlr-proceedings"/);
  assert.match(fetcherSource, /source\.type === "academic-toc"/);

  assert.match(apiSource, /MATHEMATICS_SOURCE_IDS/);
  assert.match(apiSource, /view === "mathematics"/);

  assert.match(dashboardSource, /type NavSectionId = .*"mathematics"/s);
  assert.match(dashboardSource, /\{ id: "mathematics", label: "Mathematics" \}/);
  assert.match(dashboardSource, /\{ id: "labs", label: "Labs" \},\s*\{ id: "mathematics", label: "Mathematics" \}/);
  assert.match(dashboardSource, /MATHEMATICS_GROUPS/);
  assert.match(dashboardSource, /id: "siam-applied-math"/);
  assert.match(dashboardSource, /children: \[\s*\{\s*id: "siam-sisc"/s);
  assert.match(dashboardSource, /section === "mathematics"/);
});
