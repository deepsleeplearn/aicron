import assert from "node:assert/strict";
import test from "node:test";

import { selectListTeaserText } from "../src/lib/list-teaser";

test("list teaser skips summaries that duplicate the title", () => {
  assert.equal(
    selectListTeaserText({
      title: "System prompts",
      summary: "System prompts",
      excerpt: "System prompts"
    }),
    ""
  );
});

test("list teaser falls back to a distinct excerpt", () => {
  assert.equal(
    selectListTeaserText({
      title: "System prompts",
      summary: "System prompts",
      excerpt: "Latest prompt snapshots for Claude platform models."
    }),
    "Latest prompt snapshots for Claude platform models."
  );
});

test("list teaser normalizes markdown and punctuation when comparing with title", () => {
  assert.equal(
    selectListTeaserText({
      title: "E$^2$-RAG: Towards Editable Retrieval",
      summary: "**E$^2$-RAG:** Towards Editable Retrieval",
      excerpt: "Edits compressed knowledge without retraining."
    }),
    "Edits compressed knowledge without retraining."
  );
});
