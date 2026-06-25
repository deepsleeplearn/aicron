import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");

test("dashboard card titles and summaries directly handle card-text clicks", () => {
  const pointerHandlerCount =
    dashboardSource.match(/onPointerUp=\{\(event\) => handleCardTextOpen\(event, item\)\}/g)?.length ?? 0;
  const clickHandlerCount =
    dashboardSource.match(/onClick=\{\(event\) => handleCardTextOpen\(event, item\)\}/g)?.length ?? 0;
  const keyboardHandlerCount =
    dashboardSource.match(/onKeyDown=\{\(event\) => handleCardTextKeyDown\(event, item\)\}/g)?.length ?? 0;

  assert.ok(pointerHandlerCount >= 6);
  assert.ok(clickHandlerCount >= 6);
  assert.ok(keyboardHandlerCount >= 6);
});

test("dashboard card titles and summaries render explicit card text buttons", () => {
  const buttonCount = dashboardSource.match(/className="cardTextButton/g)?.length ?? 0;
  const cardMarkdownCount = dashboardSource.match(/<InlineCardMarkdown content=/g)?.length ?? 0;

  assert.ok(buttonCount >= 6);
  assert.ok(cardMarkdownCount >= 6);
});
