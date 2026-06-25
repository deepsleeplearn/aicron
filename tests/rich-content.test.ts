import assert from "node:assert/strict";
import test from "node:test";

import {
  decodeRichHtmlContent,
  encodeRichHtmlContent,
  isRichHtmlContent,
  richContentToText
} from "../src/lib/rich-content";

test("rich html content can be encoded, decoded, and converted to text", () => {
  const content = encodeRichHtmlContent("<article><h1>Title</h1><p>Hello <strong>world</strong>.</p></article>");

  assert.equal(isRichHtmlContent(content), true);
  assert.equal(decodeRichHtmlContent(content), "<article><h1>Title</h1><p>Hello <strong>world</strong>.</p></article>");
  assert.equal(richContentToText(content), "Title Hello world.");
});

test("plain text content stays plain text for codex and article length checks", () => {
  assert.equal(isRichHtmlContent("Plain article text."), false);
  assert.equal(decodeRichHtmlContent("Plain article text."), null);
  assert.equal(richContentToText("Plain article text."), "Plain article text.");
});
