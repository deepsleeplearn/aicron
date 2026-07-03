import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dashboardCss = readFileSync("src/app/globals.css", "utf8");
const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");
const contentSource = readFileSync("src/lib/content.ts", "utf8");
const twitterUserPostsSource = readFileSync("src/lib/adapters/twitter-user-posts.ts", "utf8");

test("DetailView reader and assistant messages keep native text selection enabled", () => {
  assert.match(dashboardCss, /\.pageShell\.hasReader,\s*[\s\S]*?\.pageShell\.hasReader \.feedPanel,\s*[\s\S]*?\.articleReader,\s*[\s\S]*?\.articleReader \*,\s*[\s\S]*?\.articleTitle,\s*[\s\S]*?\.articleTitle \*,\s*[\s\S]*?\.articleTextSelectable,\s*[\s\S]*?\.articleTextSelectable \*,\s*[\s\S]*?\.readerPanel \.message,\s*[\s\S]*?\.readerPanel \.message \*\s*\{[\s\S]*?-webkit-user-select:\s*text !important;[\s\S]*?user-select:\s*text !important;/);
  assert.match(dashboardCss, /\.articleTitle,[\s\S]*?\.articleNotice \*\s*\{[\s\S]*?cursor:\s*text;/);
  assert.match(dashboardCss, /\.articleTitle a,[\s\S]*?\.articleNotice img\s*\{[\s\S]*?-webkit-user-drag:\s*none;/);
  assert.match(dashboardCss, /\.articleTextSelectable img,\s*[\s\S]*?\.articleTextSelectable video,[\s\S]*?-webkit-user-drag:\s*none;/);
  assert.doesNotMatch(dashboardCss, /\.articleTextSelectable,\s*[\s\S]*?\.articleTextSelectable \*\s*\{[\s\S]*?-webkit-user-drag:\s*none;/);
  assert.match(dashboardCss, /\.richArticleBody p,\s*[\s\S]*?\.richArticleBody \.richParagraph,/);
});

test("DetailView title and rich body use dedicated selectable text surfaces", () => {
  assert.doesNotMatch(dashboardSource, /function handleReaderTextPointerDown/);
  assert.doesNotMatch(dashboardSource, /onPointerDownCapture=\{handleReaderTextPointerDown\}/);
  assert.doesNotMatch(dashboardSource, /onMouseDownCapture=\{handleReaderTextPointerDown\}/);
  assert.match(dashboardSource, /<h1 className="articleTitle">/);
  assert.match(dashboardSource, /\{normalizeInlineMarkdownText\(selectedItem\.title\)\}/);
  assert.doesNotMatch(dashboardSource, /<InlineMarkdown content=\{selectedItem\.title\} \/>/);
  assert.match(dashboardSource, /className="articleBody articleTextSelectable"/);
  assert.match(dashboardSource, /className="articleNotice articleTextSelectable"/);
  assert.match(dashboardSource, /className="articleBody richArticleBody articleTextSelectable"/);
  assert.match(dashboardSource, /const preparedHtml = useMemo\(\(\) => prepareRichArticleHtml\(html\), \[html\]\)/);
  assert.match(dashboardSource, /const \[selectableHtml, setSelectableHtml\] = useState<string \| null>\(null\)/);
  assert.match(dashboardSource, /window\.requestAnimationFrame\(\(\) => setSelectableHtml\(preparedHtml\)\)/);
  assert.match(dashboardSource, /shouldUseNativeRichHtml\(preparedHtml\) \|\| selectableHtml !== preparedHtml/);
  assert.match(dashboardSource, /\{renderSelectableRichHtml\(preparedHtml\)\}/);
  assert.match(dashboardSource, /function renderSelectableRichHtml\(html: string\): ReactNode/);
  assert.match(dashboardSource, /function renderRichNode\(node: ChildNode, key: string\): ReactNode/);
  assert.match(dashboardSource, /function shouldUseNativeRichHtml/);
  assert.match(dashboardSource, /const TABLE_WHITESPACE_PARENT_TAGS = new Set\(\["table", "thead", "tbody", "tfoot", "tr", "colgroup"\]\)/);
  assert.match(dashboardSource, /shouldDropWhitespaceText && child\.nodeType === 3 && !\(child\.textContent \?\? ""\)\.trim\(\)/);
  const nativeRichHtmlGate = dashboardSource.match(/function shouldUseNativeRichHtml[\s\S]*?\n}/)?.[0] ?? "";
  assert.match(nativeRichHtmlGate, /\\bkatex\\b/);
  assert.doesNotMatch(nativeRichHtmlGate, /codexRadar|<svg/);
  assert.match(dashboardSource, /function styleAttributeToProperties\(styleAttribute: string \| null\): CSSProperties \| undefined/);
  assert.match(dashboardSource, /rawName\.startsWith\("--"\)/);
  assert.match(dashboardSource, /tagName === "svg"/);
  assert.match(dashboardSource, /className=\{joinClassNames\("richEmbeddedSvg", className\)\}/);
  assert.match(dashboardSource, /dangerouslySetInnerHTML=\{\{ __html: element\.outerHTML \}\}/);
  assert.match(dashboardSource, /function addReaderDragGuards/);
  assert.match(dashboardSource, /html\.replace/);
  assert.match(dashboardSource, /tagName: string, attributes: string/);
  assert.match(dashboardSource, /draggable="false"/);
  assert.match(dashboardSource, /draggable=\{false\}/);
  assert.match(dashboardSource, /tagName === "p"\) return <div key=\{key\} className=\{joinClassNames\("richParagraph", className\)\} style=\{style\}>/);
  assert.doesNotMatch(dashboardSource, /tagName === "p"\) return <p key=\{key\}/);
  assert.match(dashboardSource, /<a \{\.\.\.props\} draggable=\{false\} target="_blank" rel="noreferrer">/);
});

test("stored rich article links and media disable browser dragging", () => {
  assert.match(contentSource, /element\.attr\("draggable", "false"\)/);
  assert.match(twitterUserPostsSource, /target="_blank" rel="noreferrer" draggable="false"/);
  assert.match(twitterUserPostsSource, /<img src="\$\{escapedUrl\}"[\s\S]*?draggable="false"/);
  assert.match(twitterUserPostsSource, /<video controls src="\$\{escapedUrl\}" draggable="false">/);
});

test("Codex assistant ignores stale replies after switching DetailView articles", () => {
  const askCodexSource = dashboardSource.match(/async function askCodex[\s\S]*?\n  \}/)?.[0] ?? "";
  const selectItemSource = dashboardSource.match(/async function selectItem[\s\S]*?\n  \}/)?.[0] ?? "";
  const clearSelectionSource = dashboardSource.match(/function clearSelection[\s\S]*?\n  \}/)?.[0] ?? "";

  assert.match(askCodexSource, /const requestItemId = selectedItem\.id/);
  assert.match(askCodexSource, /itemId: requestItemId/);
  assert.match(askCodexSource, /if \(selectedIdRef\.current !== requestItemId\) return;\s*setMessages\(\[\.\.\.nextMessages, \{ role: "assistant", content: reply \}\]\)/);
  assert.match(askCodexSource, /if \(selectedIdRef\.current === requestItemId\) setCodexBusy\(false\)/);
  assert.match(selectItemSource, /setMessages\(\[\]\);\s*setCodexBusy\(false\);/);
  assert.match(clearSelectionSource, /setMessages\(\[\]\);\s*setCodexBusy\(false\);/);
});

test("Plaza drag surface can still suppress selection independently", () => {
  assert.match(dashboardCss, /\.plazaCarousel\s*\{[\s\S]*?user-select:\s*none;/);
});
