import assert from "node:assert/strict";
import test from "node:test";

import {
  extractAcademicTocRssItems,
  extractAcademicTocItems,
  extractJmlrPaperItems,
  extractOptimizationOnlineItems,
  extractOptimizationOnlineRssItems,
  extractPmlrProceedingItems
} from "../src/lib/adapters/math-publications";

test("Optimization Online adapter extracts recent eprints with dates and authors", () => {
  const items = extractOptimizationOnlineItems({
    sourceId: "optimization-online",
    sourceName: "Optimization Online",
    baseUrl: "https://optimization-online.org/",
    html: `
      <h2>Recent Eprints</h2>
      <ul>
        <li><a href="/2026/06/neural-assortment-optimization/">Neural Assortment Optimization</a>
        Published 2026/06/21 by <a>Zhen Yang</a></li>
        <li><a href="/2026/06/local-to-global-exactness/">Local-to-Global Exactness of SDP Relaxations</a>
        Published 2026/06/19 by <a>Masakazu Kojima</a>, <a>Sunyoung Kim</a></li>
      </ul>
    `
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "Neural Assortment Optimization");
  assert.equal(items[0]?.publishedAt, "2026/06/21");
  assert.match(items[0]?.content ?? "", /Authors: Zhen Yang/);
  assert.deepEqual(items[0]?.categories, ["Optimization", "Optimization Online"]);
});

test("Optimization Online adapter extracts RSS feed items", async () => {
  const items = await extractOptimizationOnlineRssItems({
    sourceId: "optimization-online",
    sourceName: "Optimization Online",
    baseUrl: "https://optimization-online.org/feed/",
    html: `
      <rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/">
        <channel>
          <item>
            <title>Skip or Insert? A Priori Optimization for Vehicle Routing</title>
            <link>https://optimization-online.org/2026/06/skip-or-insert/</link>
            <dc:creator>Yulin Han</dc:creator>
            <pubDate>Mon, 22 Jun 2026 02:19:09 +0000</pubDate>
            <category>Stochastic Programming</category>
            <description>We study a vehicle routing problem with stochastic customers.</description>
          </item>
        </channel>
      </rss>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Skip or Insert? A Priori Optimization for Vehicle Routing");
  assert.equal(items[0]?.publishedAt, "2026-06-22T02:19:09.000Z");
  assert.deepEqual(items[0]?.categories, [
    "Optimization",
    "Optimization Online",
    "Stochastic Programming"
  ]);
});

test("PMLR adapter extracts proceedings papers with abs and PDF links", () => {
  const items = extractPmlrProceedingItems({
    sourceId: "pmlr-colt",
    sourceName: "PMLR / COLT",
    baseUrl: "https://proceedings.mlr.press/v291/",
    html: `
      <h2>Volume 291: The Thirty Eighth Annual Conference on Learning Theory, 30-4 July 2025</h2>
      <div class="paper">
        <p class="title">Thompson Sampling for Bandit Convex Optimisation</p>
        <p class="details">Alireza Bakhtiari, Tor Lattimore; Proceedings of Thirty Eighth Conference on Learning Theory, PMLR 291:231-263</p>
        <p><a href="bakhtiari25a.html">abs</a> <a href="https://raw.githubusercontent.com/mlresearch/v291/bakhtiari25a.pdf">Download PDF</a></p>
      </div>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Thompson Sampling for Bandit Convex Optimisation");
  assert.equal(items[0]?.publishedAt, "2025");
  assert.equal(items[0]?.canonicalUrl, "https://proceedings.mlr.press/v291/bakhtiari25a.html");
  assert.match(items[0]?.content ?? "", /PDF: https:\/\/raw\.githubusercontent\.com\/mlresearch\/v291\/bakhtiari25a\.pdf/);
  assert.deepEqual(items[0]?.categories, ["PMLR", "COLT", "Learning Theory", "Optimization"]);
});

test("JMLR adapter extracts current volume papers", () => {
  const items = extractJmlrPaperItems({
    sourceId: "jmlr-papers",
    sourceName: "JMLR Papers",
    baseUrl: "https://www.jmlr.org/papers/v26/",
    html: `
      <dl>
        <dt>Efficiently Escaping Saddle Points in Bilevel Optimization</dt>
        <dd>Minhui Huang, Xuxing Chen, Kaiyi Ji; (1):1-61, 2025.
          [<a href="huang25a.html">abs</a>][<a href="huang25a.pdf">pdf</a>]
        </dd>
      </dl>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Efficiently Escaping Saddle Points in Bilevel Optimization");
  assert.equal(items[0]?.publishedAt, "2025");
  assert.equal(items[0]?.canonicalUrl, "https://www.jmlr.org/papers/v26/huang25a.html");
  assert.deepEqual(items[0]?.categories, ["JMLR", "Machine Learning", "Optimization"]);
});

test("academic TOC adapter extracts journal articles from publisher issue pages", () => {
  const items = extractAcademicTocItems({
    sourceId: "siam-optimization",
    sourceName: "SIAM Journal on Optimization",
    baseUrl: "https://epubs.siam.org/toc/sjope8/current",
    categories: ["SIAM", "Optimization"],
    html: `
      <article>
        <h3><a href="/doi/10.1137/25M000001">A Proximal Modified Quasi-Newton Method for Nonsmooth Regularized Optimization</a></h3>
        <div class="authors">Youssef Diouane, Mohamed L. Habiboullah, Dominique Orban</div>
        <div>Published Online: April 17, 2026</div>
        <p class="abstract">We develop a modified quasi-Newton method for nonsmooth nonconvex optimization.</p>
      </article>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(
    items[0]?.title,
    "A Proximal Modified Quasi-Newton Method for Nonsmooth Regularized Optimization"
  );
  assert.equal(items[0]?.canonicalUrl, "https://epubs.siam.org/doi/10.1137/25M000001");
  assert.equal(items[0]?.publishedAt, "April 17, 2026");
  assert.match(items[0]?.content ?? "", /Authors: Youssef Diouane/);
  assert.deepEqual(items[0]?.categories, ["SIAM", "Optimization"]);
});

test("academic TOC adapter extracts publisher pages where article links are bare headings", () => {
  const items = extractAcademicTocItems({
    sourceId: "mathprog-journal",
    sourceName: "Mathematical Programming",
    baseUrl: "https://link.springer.com/journal/10107/online-first",
    html: `
      <main>
        <div class="app-card-open">
          <h3><a href="/article/10.1007/s10107-026-00001-2">A decomposition method for stochastic integer optimization</a></h3>
          <p class="c-meta__item">Published: 23 June 2026</p>
          <p class="c-article-author-list">Ada Lovelace, Emmy Noether</p>
        </div>
        <h3><a href="/journal/10107/updates">Journal updates</a></h3>
      </main>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "A decomposition method for stochastic integer optimization");
  assert.equal(items[0]?.canonicalUrl, "https://link.springer.com/article/10.1007/s10107-026-00001-2");
  assert.equal(items[0]?.publishedAt, "23 June 2026");
  assert.match(items[0]?.content ?? "", /Authors: Ada Lovelace/);
  assert.deepEqual(items[0]?.categories, ["MOS", "Mathematical Programming", "Optimization"]);
});

test("academic TOC adapter extracts publisher eTOC RSS items", async () => {
  const items = await extractAcademicTocRssItems({
    sourceId: "siam-optimization",
    sourceName: "SIAM Journal on Optimization",
    baseUrl: "https://epubs.siam.org/action/showFeed?jc=sjope8&type=etoc&feed=rss",
    html: `
      <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
        xmlns="http://purl.org/rss/1.0/"
        xmlns:content="http://purl.org/rss/1.0/modules/content/"
        xmlns:dc="http://purl.org/dc/elements/1.1/">
        <channel rdf:about="https://epubs.siam.org/loi/sjope8?af=R">
          <title>SIAM Journal on Optimization: Table of Contents</title>
          <link>https://epubs.siam.org/loi/sjope8?af=R</link>
          <items>
            <rdf:Seq>
              <rdf:li rdf:resource="https://epubs.siam.org/doi/abs/10.1137/24M1719761?af=R"/>
            </rdf:Seq>
          </items>
        </channel>
        <item rdf:about="https://epubs.siam.org/doi/abs/10.1137/24M1719761?af=R">
          <title>Sparse Polynomial Matrix Optimization</title>
          <link>https://epubs.siam.org/doi/abs/10.1137/24M1719761?af=R</link>
          <content:encoded>SIAM Journal on Optimization, Volume 36, Issue 2, June 2026. Abstract. A polynomial matrix inequality is studied.</content:encoded>
          <dc:date>2026-04-01T07:00:00Z</dc:date>
          <dc:creator>Jared Miller</dc:creator>
        </item>
      </rdf:RDF>
    `
  });

  assert.equal(items.length, 1);
  assert.equal(items[0]?.title, "Sparse Polynomial Matrix Optimization");
  assert.equal(items[0]?.canonicalUrl, "https://epubs.siam.org/doi/abs/10.1137/24M1719761?af=R");
  assert.equal(items[0]?.publishedAt, "2026-04-01T07:00:00.000Z");
  assert.deepEqual(items[0]?.categories, ["SIAM", "Optimization"]);
});
