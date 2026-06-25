import assert from "node:assert/strict";
import test from "node:test";

import { extractBairBlogItems } from "../src/lib/adapters/bair-blog";
import { extractClaudeBlogItems } from "../src/lib/adapters/claude-blog";
import { extractCmuMlBlogItems } from "../src/lib/adapters/cmu-ml-blog";
import { extractGithubTrendingItems } from "../src/lib/adapters/github-trending";
import { extractHtmlListItems } from "../src/lib/adapters/html-list";
import { extractHuggingFacePaperCandidates } from "../src/lib/adapters/huggingface-papers";
import { extractKimiBlogItems } from "../src/lib/adapters/kimi-blog";
import { parseMarkdownChangelog } from "../src/lib/adapters/markdown-changelog";
import { extractMilaBlogItems } from "../src/lib/adapters/mila-blog";
import {
  extractOpenAICodexChangelogItems,
  extractOpenAIDevelopersBlogItems
} from "../src/lib/adapters/openai-developers";
import { parseQwenResearchArticles, parseQwenResearchItems } from "../src/lib/adapters/qwen-research";
import { normalizeRssItems } from "../src/lib/adapters/rss";
import { extractStanfordAiLabBlogItems } from "../src/lib/adapters/stanford-ai-lab";
import { extractVectorPublicationItems, fetchVectorPublicationItems } from "../src/lib/adapters/vector-publications";
import { extractZhipuModelFamilyItems } from "../src/lib/adapters/zhipu-model-family";

test("markdown changelog adapter extracts version sections", () => {
  const items = parseMarkdownChangelog({
    sourceId: "claude-code-changelog",
    sourceName: "Claude Code Changelog",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
    markdown: [
      "# Changelog",
      "",
      "## 1.2.3",
      "- Added hooks",
      "- Fixed sandbox issue",
      "",
      "## 1.2.2",
      "- Previous release"
    ].join("\n")
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "Claude Code Changelog 1.2.3");
  assert.match(items[0]?.content ?? "", /Added hooks/);
});

test("bair blog adapter extracts post cards with date-only published values", () => {
  const html = `
    <header>
      <a href="/blog/subscribe/">Subscribe</a>
      <a href="/blog/archive/">Archive</a>
    </header>
    <main>
      <div class="posts">
        <div class="post">
          <h1 class="h1 post-title">
            <a href="/blog/2026/05/08/adaptive-parallel-reasoning/" class="post-link">
              Adaptive Parallel Reasoning: The Next Paradigm in Efficient Inference Scaling
            </a>
          </h1>
          <p class="post-summary">What if a reasoning model could decide when to parallelize subtasks?</p>
          <span class="post-meta">Stephen Xie and Long Lian</span>
          <span class="post-meta">May 8, 2026</span>
          <a href="/blog/2026/05/08/adaptive-parallel-reasoning/">Continue</a>
        </div>
        <div class="post">
          <h1 class="h1 post-title">
            <a href="/blog/2026/04/20/grasp/" class="post-link">Gradient-based Planning for World Models at Longer Horizons</a>
          </h1>
          <p class="post-summary">Gradient-based planning for learned world models.</p>
          <span class="post-meta">Michael Psenka</span>
          <span class="post-meta">Apr 20, 2026</span>
        </div>
      </div>
    </main>
  `;

  const items = extractBairBlogItems({
    sourceId: "bair-blog",
    sourceName: "BAIR Blog",
    baseUrl: "https://bair.berkeley.edu/blog/",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    [
      "Adaptive Parallel Reasoning: The Next Paradigm in Efficient Inference Scaling",
      "Gradient-based Planning for World Models at Longer Horizons"
    ]
  );
  assert.equal(items[0]?.canonicalUrl, "https://bair.berkeley.edu/blog/2026/05/08/adaptive-parallel-reasoning");
  assert.equal(items[0]?.publishedAt, "May 8, 2026");
  assert.equal(items[0]?.excerpt, "What if a reasoning model could decide when to parallelize subtasks?");
  assert.deepEqual(items[0]?.categories, ["BAIR"]);
});

test("cmu ml blog adapter extracts official blog posts with date-only published values", () => {
  const html = `
    <main>
      <article>
        <a href="https://blog.ml.cmu.edu/category/research/">Research</a>
        <a href="https://blog.ml.cmu.edu/category/artificial-intelligence/">artificial intelligence</a>
        <a href="https://blog.ml.cmu.edu/2026/06/17/pre-training-isnt-bitter-enough/">
          <h2>Pre-Training Isn’t Bitter Enough</h2>
        </a>
        <p>by <a href="https://shuqike.com">Shuqi Ke</a> / June 17, 2026</p>
        <p>Richard Sutton’s Bitter Lesson is usually read as a warning against building too much human knowledge into AI systems.</p>
      </article>
      <article>
        <a href="https://blog.ml.cmu.edu/category/machine-learning/">machine learning</a>
        <h3>
          <a href="https://blog.ml.cmu.edu/2026/04/13/when-should-ai-step-aside/">
            When Should AI Step Aside?: Teaching Agents When Humans Want to Intervene
          </a>
        </h3>
        <time>April 13, 2026</time>
        <p>Recent advances in large language models have enabled AI agents to perform increasingly complex tasks.</p>
      </article>
    </main>
  `;

  const items = extractCmuMlBlogItems({
    sourceId: "cmu-ml-blog",
    sourceName: "CMU ML Blog",
    baseUrl: "https://blog.ml.cmu.edu/",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    [
      "Pre-Training Isn’t Bitter Enough",
      "When Should AI Step Aside?: Teaching Agents When Humans Want to Intervene"
    ]
  );
  assert.equal(items[0]?.canonicalUrl, "https://blog.ml.cmu.edu/2026/06/17/pre-training-isnt-bitter-enough");
  assert.equal(items[0]?.publishedAt, "June 17, 2026");
  assert.match(items[0]?.excerpt ?? "", /Richard Sutton/);
  assert.deepEqual(items[0]?.categories, ["CMU ML", "Research", "artificial intelligence"]);
});

test("mila blog adapter extracts article teasers with date-only published values", () => {
  const html = `
    <main>
      <div class="node node--type-article node--view-mode-teaser">
        <div class="field-name-field-image3">
          <a href="/en/article/improving-cad-design-with-llms"><img src="/image.jpg" alt="" /></a>
        </div>
        <div class="field-name-node-post-date"><div class="field-item even">December 19, 2025</div></div>
        <div class="field-name-node-title">
          <a href="/en/article/improving-cad-design-with-llms">Improving CAD Design With LLMs</a>
        </div>
        <div class="field-name-field-blocks1">
          <div class="authors"><a href="/en/directory/prashant-govindarajan">Prashant Govindarajan</a></div>
          <div class="authors"><a href="/en/directory/sarath-chandar">Sarath Chandar</a></div>
        </div>
        <a href="/en/article/improving-cad-design-with-llms" class="button-arrow-under">Read the article</a>
      </div>
      <div class="node node--type-article node--view-mode-teaser">
        <div class="field-name-node-post-date"><div class="field-item even">October 8, 2025</div></div>
        <div class="field-name-node-title">
          <a href="/en/article/why-ai-models-hallucinate-and-how-to-fix-them">Why AI Models Hallucinate and How to Fix Them</a>
        </div>
      </div>
    </main>
  `;

  const items = extractMilaBlogItems({
    sourceId: "mila-blog",
    sourceName: "Mila Blog",
    baseUrl: "https://mila.quebec/en/research/blog",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["Improving CAD Design With LLMs", "Why AI Models Hallucinate and How to Fix Them"]
  );
  assert.equal(items[0]?.canonicalUrl, "https://mila.quebec/en/article/improving-cad-design-with-llms");
  assert.equal(items[0]?.publishedAt, "December 19, 2025");
  assert.equal(items[0]?.excerpt, "By Prashant Govindarajan, Sarath Chandar");
  assert.deepEqual(items[0]?.categories, ["Mila"]);
});

test("vector publications adapter extracts paper links with year-only dates", () => {
  const html = `
    <main>
      <article class="unit tease tease-publications all-m-b-2" id="tease-25027">
        <a class="tease__anchor" href="https://www.cell.com/matter/abstract/S2590-2385(24)00542-3" target="_blank" aria-label="ORGANA: a robotic assistant for automated chemistry experimentation and characterization">
          <div class="tease__content">
            <h3 class="tease__title all-m-0 all-m-b-half">ORGANA: a robotic assistant for automated chemistry experimentation and characterization</h3>
            <div class="tease__details">
              <p class="tease__authors">Kourosh Darvish and Marta Skreta and Alan Aspuru-Guzik</p>
              <p class="tease__source"><span class="tease__year">2025 </span><span class="tease__volume">Matter</span></p>
            </div>
          </div>
        </a>
      </article>
      <article class="unit tease tease-publications all-m-b-2" id="tease-25054">
        <a class="tease__anchor" href="https://openreview.net/forum?id=KzSGJy1PIf" target="_blank" aria-label="Selective Unlearning via Representation Erasure Using Adversarial Training">
          <div class="tease__content">
            <h3 class="tease__title all-m-0 all-m-b-half">Selective Unlearning via Representation Erasure Using Adversarial Training</h3>
            <div class="tease__details">
              <p class="tease__authors">Nazanin Mohammadi Sepahvand, Eleni Triantafillou, Daniel M. Roy</p>
              <p class="tease__source"><span class="tease__year">2025 </span></p>
            </div>
          </div>
        </a>
      </article>
    </main>
  `;

  const items = extractVectorPublicationItems({
    sourceId: "vector-publications",
    sourceName: "Vector Institute Publications",
    baseUrl: "https://vectorinstitute.ai/research-talent/publications/",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    [
      "ORGANA: a robotic assistant for automated chemistry experimentation and characterization",
      "Selective Unlearning via Representation Erasure Using Adversarial Training"
    ]
  );
  assert.equal(items[0]?.canonicalUrl, "https://www.cell.com/matter/abstract/S2590-2385(24)00542-3");
  assert.equal(items[0]?.publishedAt, "2025");
  assert.equal(items[0]?.excerpt, "Kourosh Darvish and Marta Skreta and Alan Aspuru-Guzik");
  assert.match(items[0]?.content ?? "", /Source: Matter/);
  assert.deepEqual(items[0]?.categories, ["Vector Institute", "paper"]);
});

test("vector publications fetcher keeps external publication content unhydrated", async (t) => {
  const originalFetch = globalThis.fetch;
  const listUrl = "https://vectorinstitute.ai/research-talent/publications/";
  const publicationUrl = "https://pubs.example.org/en/content/articlehtml/2026/example";
  const listHtml = `
    <main>
      <article class="unit tease tease-publications all-m-b-2">
        <a class="tease__anchor" href="${publicationUrl}" target="_blank" aria-label="Vector paper">
          <div class="tease__content">
            <h3 class="tease__title all-m-0 all-m-b-half">Vector paper</h3>
            <div class="tease__details">
              <p class="tease__authors">Ada Lovelace and Alan Turing</p>
              <p class="tease__source"><span class="tease__year">2026 </span><span>Example Journal</span></p>
            </div>
          </div>
        </a>
      </article>
    </main>
  `;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async (url: string | URL | Request) => {
    const requested = typeof url === "string" ? url : url instanceof URL ? url.toString() : url.url;
    if (requested === listUrl) {
      return new Response(listHtml, { headers: { "content-type": "text/html" } });
    }
    if (requested === publicationUrl) {
      throw new Error("Vector external publication pages should not be fetched");
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;

  const items = await fetchVectorPublicationItems({
    sourceId: "vector-publications",
    sourceName: "Vector Institute Publications",
    url: listUrl
  });

  assert.equal(items.length, 1);
  assert.match(items[0]?.content ?? "", /Authors: Ada Lovelace and Alan Turing/);
  assert.match(items[0]?.content ?? "", /Source: Example Journal/);
  assert.doesNotMatch(items[0]?.content ?? "", /full publication body/);
});

test("rss adapter resolves relative links and sorts newest first", () => {
  const items = normalizeRssItems({
    sourceId: "stanford-ai-lab-blog",
    sourceName: "Stanford AI Lab Blog",
    url: "https://ai.stanford.edu/blog/feed.xml",
    items: [
      {
        title: "Older Stanford AI post",
        link: "/blog/older/",
        pubDate: "Mon, 01 Jan 2024 00:00:00 GMT",
        contentSnippet: "Older summary"
      },
      {
        title: "Newer Stanford AI post",
        link: "/blog/newer/",
        pubDate: "Mon, 01 Jan 2026 00:00:00 GMT",
        content: "<h2>New method</h2><p>We improve <strong>multimodal</strong> reasoning.</p>",
        summary: "<p>Newer <em>summary</em></p>"
      }
    ]
  });

  assert.equal(items[0]?.title, "Newer Stanford AI post");
  assert.equal(items[0]?.canonicalUrl, "https://ai.stanford.edu/blog/newer");
  assert.equal(items[0]?.content, "New method We improve multimodal reasoning.");
  assert.equal(items[0]?.excerpt, "Newer summary");
  assert.equal(items[1]?.canonicalUrl, "https://ai.stanford.edu/blog/older");
});

test("html list adapter extracts links matching configured path prefixes", () => {
  const html = `
    <main>
      <a href="/news/model-release">Model Release</a>
      <a href="/careers">Jobs</a>
      <a href="https://www.anthropic.com/news/research-update">Research Update</a>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "anthropic-news",
    sourceName: "Anthropic News",
    baseUrl: "https://www.anthropic.com/news",
    html,
    includePathPrefixes: ["/news/"]
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["Model Release", "Research Update"]
  );
  assert.equal(items[0]?.canonicalUrl, "https://www.anthropic.com/news/model-release");
});

test("html list adapter prefers card headings over full link text", () => {
  const html = `
    <main>
      <a href="/news/claude-corps">
        <div><span>Announcements</span><time>Jun 11, 2026</time></div>
        <h4>Introducing Claude Corps</h4>
        <p>We are launching a national fellowship program.</p>
      </a>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "anthropic-news",
    sourceName: "Anthropic News",
    baseUrl: "https://www.anthropic.com/news",
    html,
    includePathPrefixes: ["/news/"]
  });

  assert.equal(items[0]?.title, "Introducing Claude Corps");
  assert.equal(items[0]?.excerpt, "We are launching a national fellowship program.");
  assert.equal(items[0]?.publishedAt, "Jun 11, 2026");
});

test("html list adapter reads title-like elements when no heading exists", () => {
  const html = `
    <main>
      <a href="/news/claude-fable-5-mythos-5">
        <div><time>Jun 9, 2026</time><span>Announcements</span></div>
        <span class="PublicationList_title body-3">Claude Fable 5 and Claude Mythos 5</span>
      </a>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "anthropic-news",
    sourceName: "Anthropic News",
    baseUrl: "https://www.anthropic.com/news",
    html,
    includePathPrefixes: ["/news/"]
  });

  assert.equal(items[0]?.title, "Claude Fable 5 and Claude Mythos 5");
  assert.equal(items[0]?.publishedAt, "Jun 9, 2026");
});

test("html list adapter extracts card date and article excerpt", () => {
  const html = `
    <main>
      <a href="/blog/minimax-m3">
        <span>AI</span>
        <span>2026-06-09</span>
        <h3>MiniMax M3</h3>
        <article>前沿 Coding 能力，1M上下文，原生多模态。</article>
      </a>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "minimax-blog",
    sourceName: "MiniMax Blog",
    baseUrl: "https://www.minimaxi.com/blog",
    html,
    includePathPrefixes: ["/blog/"]
  });

  assert.equal(items[0]?.title, "MiniMax M3");
  assert.equal(items[0]?.publishedAt, "2026-06-09");
  assert.equal(items[0]?.excerpt, "前沿 Coding 能力，1M上下文，原生多模态。");
});

test("html list adapter reads excerpts from sibling card containers", () => {
  const html = `
    <main>
      <div class="info">
        <header>
          <a class="post-link" href="/blog/mstar/">
            <h2>M*: A Modular, Extensible, Serving System for Multimodal Models</h2>
          </a>
          <p class="meta"><!-- June 15, 2026 --></p>
        </header>
        <div class="excerpt">
          <div class="excerpt-text">
            M* is a modular serving system for multimodal models.
          </div>
        </div>
      </div>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "stanford-ai-lab-blog",
    sourceName: "Stanford AI Lab Blog",
    baseUrl: "http://ai.stanford.edu/blog/",
    html,
    includePathPrefixes: ["/blog/"]
  });

  assert.equal(items[0]?.title, "M*: A Modular, Extensible, Serving System for Multimodal Models");
  assert.equal(items[0]?.excerpt, "M* is a modular serving system for multimodal models.");
  assert.equal(items[0]?.publishedAt, "June 15, 2026");
});

test("html list adapter skips links pointing to the source index itself", () => {
  const html = `
    <main>
      <a href="/blog/">The Stanford AI Lab Blog</a>
      <a href="/blog/mstar/"><h2>M*: A Modular, Extensible, Serving System for Multimodal Models</h2></a>
    </main>
  `;

  const items = extractHtmlListItems({
    sourceId: "stanford-ai-lab-blog",
    sourceName: "Stanford AI Lab Blog",
    baseUrl: "http://ai.stanford.edu/blog/",
    html,
    includePathPrefixes: ["/blog/"]
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["M*: A Modular, Extensible, Serving System for Multimodal Models"]
  );
});

test("stanford ai lab adapter extracts only posts and assigns official category labels", () => {
  const html = `
    <nav>
      <a href="/blog/">The Stanford AI Lab Blog</a>
      <a href="/blog/nlp">NLP</a>
    </nav>
    <main>
      <h1 id="All+Posts" class="title">All Posts</h1>
      <div class="posts">
        <div class="post-teaser">
          <div class="post-img"><img src="/assets/mstar.png" /></div>
          <div class="info">
            <a class="post-link" href="/blog/mstar/">
              <h2>M*: A Modular, Extensible, Serving System for Multimodal Models</h2>
            </a>
            <p class="meta">Stanford AI Lab <!-- June 15, 2026 --></p>
            <div class="excerpt"><div class="excerpt-text">M* is a modular serving system for multimodal models.</div></div>
          </div>
        </div>
        <div class="post-teaser">
          <div class="info">
            <a class="post-link" href="/blog/vagen/">
              <h2>VAGEN: Teaching Vision-Language Models to Build World Models Through Reinforcement Learning</h2>
            </a>
            <p class="meta">Stanford AI Lab <!-- May 1, 2026 --></p>
            <div class="excerpt-text">VAGEN trains visual agents with reinforcement learning.</div>
          </div>
        </div>
      </div>
    </main>
  `;
  const categories = new Map([
    ["http://ai.stanford.edu/blog/mstar", ["NLP", "Machine Learning"]],
    ["http://ai.stanford.edu/blog/vagen", ["Reinforcement Learning", "Computer Vision"]]
  ]);

  const items = extractStanfordAiLabBlogItems({
    sourceId: "stanford-ai-lab-blog",
    sourceName: "Stanford AI Lab Blog",
    baseUrl: "http://ai.stanford.edu/blog/",
    html,
    categories
  });

  assert.deepEqual(
    items.map((item) => item.title),
    [
      "M*: A Modular, Extensible, Serving System for Multimodal Models",
      "VAGEN: Teaching Vision-Language Models to Build World Models Through Reinforcement Learning"
    ]
  );
  assert.equal(items[0]?.publishedAt, "June 15, 2026");
  assert.equal(items[0]?.excerpt, "M* is a modular serving system for multimodal models.");
  assert.deepEqual(items[0]?.categories, ["Stanford AI Lab", "Computer Vision", "NLP", "Machine Learning"]);
  assert.deepEqual(items[1]?.categories, [
    "Stanford AI Lab",
    "Computer Vision",
    "NLP",
    "Machine Learning",
    "Reinforcement Learning"
  ]);
});

test("stanford ai lab adapter falls back to visible category labels for every post", () => {
  const html = `
    <main>
      <div class="posts">
        <div class="post-teaser">
          <div class="info">
            <a class="post-link" href="/blog/tstar/">
              <h2>T*: Rethinking Temporal Search for Long-Form Video Understanding</h2>
            </a>
            <p class="meta">Stanford AI Lab <!-- January 15, 2026 --></p>
            <div class="excerpt-text">A benchmark for long-form video understanding.</div>
          </div>
        </div>
      </div>
    </main>
  `;

  const items = extractStanfordAiLabBlogItems({
    sourceId: "stanford-ai-lab-blog",
    sourceName: "Stanford AI Lab Blog",
    baseUrl: "http://ai.stanford.edu/blog/",
    html,
    categories: new Map()
  });

  assert.ok(items[0]?.categories?.includes("Computer Vision"));
  assert.ok(items[0]?.categories?.includes("Machine Learning"));
});

test("kimi blog adapter extracts article cards from kimi blog page", () => {
  const html = `
    <main>
      <section>
        <h2>Research</h2>
        <a href="/blog/kimi-k2-6-stronger-agentic-coding">
          <time datetime="2026-06-18">Jun 18, 2026</time>
          <h3>Kimi K2.6: Stronger Agentic Coding</h3>
          <p>Better long-horizon autonomy and more token-efficient thinking.</p>
        </a>
        <a href="/blog/">Blog</a>
        <a href="https://github.com/MoonshotAI/Kimi-K2">Github</a>
      </section>
    </main>
  `;

  const items = extractKimiBlogItems({
    sourceId: "kimi-blog",
    sourceName: "Kimi Blog",
    baseUrl: "https://www.kimi.com/blog/",
    html
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Kimi K2.6: Stronger Agentic Coding");
  assert.equal(items[0]?.canonicalUrl, "https://www.kimi.com/blog/kimi-k2-6-stronger-agentic-coding");
  assert.equal(items[0]?.publishedAt, "2026-06-18");
  assert.match(items[0]?.excerpt ?? "", /long-horizon autonomy/);
});

test("kimi blog adapter falls back to script-rendered article data", () => {
  const html = `
    <html>
      <head></head>
      <body>
        <script>
          self.__next_f.push(["$","article",null,{"title":"Kimi Linear: An Expressive, Efficient Attention Architecture","description":"Efficient attention architecture by Moonshot AI.","href":"https:\\/\\/www.kimi.com\\/blog\\/kimi-linear-expressive-efficient-attention-architecture","date":"2026-06-12"}])
        </script>
      </body>
    </html>
  `;

  const items = extractKimiBlogItems({
    sourceId: "kimi-blog",
    sourceName: "Kimi Blog",
    baseUrl: "https://www.kimi.com/blog/",
    html
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Kimi Linear: An Expressive, Efficient Attention Architecture");
  assert.equal(
    items[0]?.canonicalUrl,
    "https://www.kimi.com/blog/kimi-linear-expressive-efficient-attention-architecture"
  );
  assert.equal(items[0]?.publishedAt, "2026-06-12");
});

test("kimi blog adapter ignores script asset urls", () => {
  const html = `
    <html>
      <body>
        <script>
          window.__assets = ["/blog/assets/style.DMuQ7hoa.css", "/blog/assets/app.BYo6wOYk.js", "/blog/vp-icons.css"];
          window.__posts = [{"title":"Agent Swarm","href":"/blog/agent-swarm"}];
        </script>
      </body>
    </html>
  `;

  const items = extractKimiBlogItems({
    sourceId: "kimi-blog",
    sourceName: "Kimi Blog",
    baseUrl: "https://www.kimi.com/blog/",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["Agent Swarm"]
  );
  assert.equal(items[0]?.canonicalUrl, "https://www.kimi.com/blog/agent-swarm");
});

test("github trending adapter extracts repositories with direct project links", () => {
  const html = `
    <main>
      <article class="Box-row">
        <h2>
          <a href="/openai/codex">
            openai
            /
            codex
          </a>
        </h2>
        <p>Lightweight coding agent that runs in your terminal.</p>
        <span itemprop="programmingLanguage">TypeScript</span>
        <a href="/openai/codex/stargazers">42,000</a>
        <a href="/openai/codex/forks">3,100</a>
        <span class="d-inline-block float-sm-right">1,024 stars today</span>
      </article>
    </main>
  `;

  const items = extractGithubTrendingItems({
    sourceId: "github-trending",
    sourceName: "GitHub Trending",
    baseUrl: "https://github.com/trending?since=daily",
    html
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "openai/codex");
  assert.equal(items[0]?.canonicalUrl, "https://github.com/openai/codex");
  assert.match(items[0]?.excerpt ?? "", /Lightweight coding agent/);
  assert.match(items[0]?.excerpt ?? "", /TypeScript/);
  assert.match(items[0]?.content ?? "", /项目地址：https:\/\/github.com\/openai\/codex/);
  assert.deepEqual(items[0]?.categories, ["github-trending", "TypeScript"]);
});

test("huggingface paper candidates keep page submit order", () => {
  const html = `
    <head>
      <meta property="og:url" content="https://huggingface.co/papers/date/2026-06-19" />
    </head>
    <main>
      <article>
        <h3><a href="/papers/2606.00003">Third submitted paper</a></h3>
        <p>Third abstract.</p>
      </article>
      <article>
        <h3><a href="/papers/2606.00001">First submitted paper</a></h3>
        <p>First abstract.</p>
      </article>
    </main>
  `;

  const items = extractHuggingFacePaperCandidates({
    html,
    baseUrl: "https://huggingface.co/papers",
    maxItems: 20
  });

  assert.deepEqual(
    items.map((item) => [item.title, item.sourceOrder, item.submittedAt]),
    [
      ["Third submitted paper", 0, "2026-06-19"],
      ["First submitted paper", 1, "2026-06-19"]
    ]
  );
});

test("claude blog adapter extracts post grid cards", () => {
  const html = `
    <main>
      <div class="marquee_cms_blog_list_item">
        <h2>Top carousel item</h2>
        <a href="/blog/top-carousel">Read more</a>
      </div>
      <div class="blog_cms_item">
        <div class="u-text-style-caption">Jun 17, 2026</div>
        <div class="card_blog_title">Meet the winners of our Claude Opus 4.8 Build Day hackathon</div>
        <div class="card-main_tag-wrap"><div class="u-text-style-caption">Claude Code</div></div>
        <a href="/blog/meet-the-winners-of-our-claude-opus-4-8-build-day-hackathon">Read more</a>
      </div>
      <div class="blog_cms_item">
        <div class="u-text-style-caption">Jun 17, 2026</div>
        <div class="card_blog_title">Claude Design now stays on brand for daily work</div>
        <div class="card-main_tag-wrap"><div class="u-text-style-caption">Product announcements</div></div>
        <a href="/blog/claude-design-stays-on-brand-for-daily-work">Read more</a>
      </div>
    </main>
  `;

  const items = extractClaudeBlogItems({
    sourceId: "claude-blog-posts",
    sourceName: "Claude Blog Posts",
    baseUrl: "https://claude.com/blog",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    [
      "Meet the winners of our Claude Opus 4.8 Build Day hackathon",
      "Claude Design now stays on brand for daily work"
    ]
  );
  assert.equal(items[0]?.canonicalUrl, "https://claude.com/blog/meet-the-winners-of-our-claude-opus-4-8-build-day-hackathon");
  assert.equal(items[0]?.publishedAt, "2026-06-17");
  assert.deepEqual(items[0]?.categories, ["Claude Code"]);
});

test("openai developers blog adapter keeps article cards and skips topic links", () => {
  const html = `
    <main>
      <a href="/blog/topic/codex">View all</a>
      <a href="/blog/skills-agents-sdk">
        <div class="px-4 pt-4 text-secondary">Mar 9</div>
        <div class="line-clamp-2">Using skills to accelerate OSS maintenance</div>
        <p>Using skills and GitHub Actions to optimize Codex workflows.</p>
        <div class="text-sm text-secondary">Codex</div>
      </a>
    </main>
  `;

  const items = extractOpenAIDevelopersBlogItems({
    sourceId: "openai-codex-blog",
    sourceName: "Codex Blog",
    baseUrl: "https://developers.openai.com/blog",
    html
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Using skills to accelerate OSS maintenance");
  assert.equal(items[0]?.canonicalUrl, "https://developers.openai.com/blog/skills-agents-sdk");
  assert.match(items[0]?.publishedAt ?? "", /^\d{4}-03-09$/);
  assert.deepEqual(items[0]?.categories, ["blog", "Codex"]);
});

test("openai developers blog adapter can attach full article content by canonical url", () => {
  const html = `
    <main>
      <a href="/blog/designing-delightful-frontends-with-gpt-5-4">
        <div class="line-clamp-2">Designing delightful frontends with GPT-5.4</div>
        <p>Practical techniques for steering GPT-5.4.</p>
        <div class="text-secondary">Jun 18</div>
        <div class="text-sm text-secondary">Codex</div>
      </a>
    </main>
  `;
  const canonicalUrl = "https://developers.openai.com/blog/designing-delightful-frontends-with-gpt-5-4";

  const items = extractOpenAIDevelopersBlogItems({
    sourceId: "openai-codex-blog",
    sourceName: "Codex Blog",
    baseUrl: "https://developers.openai.com/blog",
    html,
    contentByCanonicalUrl: {
      [canonicalUrl]: "Full article text. ".repeat(80)
    }
  });

  assert.equal(items[0]?.canonicalUrl, canonicalUrl);
  assert.equal(items[0]?.content, "Full article text. ".repeat(80));
});

test("openai codex changelog adapter extracts dated updates", () => {
  const html = `
    <main>
      <a href="/codex/changelog?type=codex-app">Codex app</a>
      <section>
        <div>
          <div><time>2026-06-18</time></div>
          <h3><span>Codex CLI <span>0.141.0</span></span><button data-anchor-id="github-release-341160952"></button></h3>
        </div>
        <article><p>Includes shell tool improvements and integration fixes.</p></article>
        <div>
          <div><time>2026-06-16</time></div>
          <h3><span>Codex app features are available in the EEA, UK, and Switzerland</span><button data-anchor-id="codex-2026-06-16-app"></button></h3>
        </div>
        <article><p>Computer Use, Chrome extension, Memories, and Chronicle are rolling out.</p></article>
      </section>
    </main>
  `;

  const items = extractOpenAICodexChangelogItems({
    sourceId: "openai-codex-changelog",
    sourceName: "Codex Changelog",
    baseUrl: "https://developers.openai.com/codex/changelog",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["Codex CLI 0.141.0", "Codex app features are available in the EEA, UK, and Switzerland"]
  );
  assert.equal(
    items[0]?.canonicalUrl,
    "https://developers.openai.com/codex/changelog#github-release-341160952"
  );
  assert.match(items[1]?.excerpt ?? "", /Chrome extension/);
});

test("qwen research adapter extracts newest research records first", () => {
  const items = parseQwenResearchItems({
    sourceId: "qwen-research",
    sourceName: "Qwen Research",
    records: [
      {
        id: "old",
        title: "Qwen-Image",
        date: "2025-08-04",
        introduction: "Image generation model.",
        tags: ["model"]
      },
      {
        id: "new",
        title: "Qwen3-Max",
        date: "2025-09-24",
        introduction: "Flagship model release.",
        tags: ["research"]
      }
    ]
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "Qwen3-Max");
  assert.equal(items[0]?.canonicalUrl, "https://qwen.ai/research/new");
  assert.equal(items[0]?.publishedAt, "2025-09-24");
  assert.deepEqual(items[0]?.categories, ["research"]);
});

test("qwen research adapter supports the live article retrieval shape", () => {
  const items = parseQwenResearchArticles({
    sourceId: "qwen-research",
    sourceName: "Qwen Research",
    articles: [
      {
        title: "Qwen3.7-Plus: Multimodal Agent Intelligence",
        path: "qwen3.7-plus",
        content: "<html><body><article><h1>Qwen3.7-Plus</h1><p>Agent intelligence update.</p></article></body></html>",
        extra: {
          date: "2026-06-01T10:00:00+08:00",
          description: "Multimodal agent release.",
          tags: ["Release"]
        }
      },
      {
        title: "Qwen-Robot Suite: A Foundation Model Suite for Physical World Intelligence",
        path: "qwen-robotsuite",
        content: "<html><body><article><p>Physical world intelligence.</p></article></body></html>",
        extra: {
          date: "2026-06-16T10:00:00+08:00",
          description: "Robot foundation model suite.",
          tags: ["Release"]
        }
      }
    ]
  });

  assert.equal(items[0]?.title, "Qwen-Robot Suite: A Foundation Model Suite for Physical World Intelligence");
  assert.equal(items[0]?.canonicalUrl, "https://qwen.ai/research/qwen-robotsuite");
  assert.equal(items[0]?.publishedAt, "2026-06-16T10:00:00+08:00");
  assert.match(items[0]?.content ?? "", /Physical world intelligence/);
});

test("qwen research adapter strips style tags from summaries", () => {
  const items = parseQwenResearchArticles({
    sourceId: "qwen-research",
    sourceName: "Qwen Research",
    articles: [
      {
        title: "Qwen3.7-Plus: Multimodal Agent Intelligence",
        path: "qwen3.7-plus",
        extra: {
          date: "2026-06-01T10:00:00+08:00",
          description: "<style>table { width: 85%; }</style>Today we introduce Qwen3.7-Plus.",
          tags: ["Release"]
        }
      }
    ]
  });

  assert.equal(items[0]?.excerpt, "Today we introduce Qwen3.7-Plus.");
  assert.doesNotMatch(items[0]?.excerpt ?? "", /style|table|width/i);
});

test("zhipu model family adapter returns the flagship scene cards as fallback", () => {
  const items = extractZhipuModelFamilyItems({
    sourceId: "zhipu-model-family",
    sourceName: "ZhipuAI Flagship Models",
    url: "https://chat.z.ai/",
    html: "<html><body></body></html>"
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["GLM-5.2", "GLM-5V-Turbo", "GLM-Image", "GLM-OCR", "GLM-ASR", "GLM-TTS"]
  );
  assert.equal(items[0]?.canonicalUrl, "https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2");
  assert.match(items[0]?.excerpt ?? "", /Code Arena/);
  assert.match(items[5]?.excerpt ?? "", /语音合成/);
});

test("zhipu model family adapter extracts the flagship model family section", () => {
  const html = `
    <section>
      <h2>旗舰模型家族，覆盖全场景</h2>
      <div><span>旗舰模型</span><h3>GLM-5.2</h3><p>Coding 能力开源 SOTA，Code Arena 全球可用模型第一。</p></div>
      <div><span>多模态Coding基座</span><h3>GLM-5V-Turbo</h3><p>面向视觉编程打造，上下文200K。</p></div>
      <div><span>图像生成</span><h3>GLM-Image</h3><p>文字渲染开源SOTA，海报、科普图等图文混合场景表现佳。</p></div>
      <div><span>视觉模型</span><h3>GLM-OCR</h3><p>轻量专业的 OCR 模型，又准又省。</p></div>
      <div><span>语音识别</span><h3>GLM-ASR</h3><p>实时高清度语音转写，多场景、多语言表现出色。</p></div>
      <div><span>语音合成</span><h3>GLM-TTS</h3><p>超拟人语音合成，塑造生动自然。</p></div>
    </section>
  `;

  const items = extractZhipuModelFamilyItems({
    sourceId: "zhipu-model-family",
    sourceName: "ZhipuAI Flagship Models",
    url: "https://chat.z.ai/",
    html
  });

  assert.deepEqual(
    items.map((item) => item.title),
    ["GLM-5.2", "GLM-5V-Turbo", "GLM-Image", "GLM-OCR", "GLM-ASR", "GLM-TTS"]
  );
  assert.equal(items[0]?.canonicalUrl, "https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2");
  assert.deepEqual(items[4]?.categories, ["model", "语音识别"]);
  assert.match(items[2]?.excerpt ?? "", /图文混合/);
});
