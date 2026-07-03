import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { getAggregateNavScope } from "../src/lib/nav-aggregation";
import { PLAZA_SOURCE_IDS } from "../src/lib/plaza";
import { DEFAULT_SOURCES } from "../src/lib/sources";
import { sortTwitterUserPostItems } from "../src/lib/twitter-timeline-order";

const KARPATHY_SOURCE_ID = "karpathy-x-posts";
const RASCHKA_SOURCE_ID = "raschka-x-posts";
const BORIS_CHERNY_SOURCE_ID = "boris-cherny-x-posts";
const ALPHAXIV_SOURCE_ID = "alphaxiv-x-posts";
const ANATOLI_KOPADZE_SOURCE_ID = "anatoli-kopadze-x-posts";
const LILIAN_WENG_SOURCE_ID = "lilian-weng-x-posts";
const TIBO_SOURCE_ID = "tibo-x-posts";
const OPENAI_X_SOURCE_ID = "openai-x-posts";
const CHATGPT_X_SOURCE_ID = "chatgpt-x-posts";
const ANTHROPIC_X_SOURCE_ID = "anthropic-x-posts";
const CLAUDE_X_SOURCE_ID = "claude-x-posts";

test("Experts&Bloggers config exposes X posts as crawlable person sources", () => {
  const karpathySource = DEFAULT_SOURCES.find((candidate) => candidate.id === KARPATHY_SOURCE_ID);
  const raschkaSource = DEFAULT_SOURCES.find((candidate) => candidate.id === RASCHKA_SOURCE_ID);
  const borisChernySource = DEFAULT_SOURCES.find((candidate) => candidate.id === BORIS_CHERNY_SOURCE_ID);
  const alphaxivSource = DEFAULT_SOURCES.find((candidate) => candidate.id === ALPHAXIV_SOURCE_ID);
  const anatoliKopadzeSource = DEFAULT_SOURCES.find((candidate) => candidate.id === ANATOLI_KOPADZE_SOURCE_ID);
  const lilianWengSource = DEFAULT_SOURCES.find((candidate) => candidate.id === LILIAN_WENG_SOURCE_ID);
  const tiboSource = DEFAULT_SOURCES.find((candidate) => candidate.id === TIBO_SOURCE_ID);
  const openaiXSource = DEFAULT_SOURCES.find((candidate) => candidate.id === OPENAI_X_SOURCE_ID);
  const chatgptXSource = DEFAULT_SOURCES.find((candidate) => candidate.id === CHATGPT_X_SOURCE_ID);
  const anthropicXSource = DEFAULT_SOURCES.find((candidate) => candidate.id === ANTHROPIC_X_SOURCE_ID);
  const claudeXSource = DEFAULT_SOURCES.find((candidate) => candidate.id === CLAUDE_X_SOURCE_ID);

  assert.ok(karpathySource, "karpathy-x-posts source should exist");
  assert.equal(karpathySource.name, "Andrej Karpathy X Posts");
  assert.equal(karpathySource.vendor, "Andrej Karpathy");
  assert.equal(karpathySource.category, "experts-bloggers");
  assert.equal(karpathySource.type, "twitter-user-posts");
  assert.equal(karpathySource.url, "https://x.com/karpathy");
  assert.equal(karpathySource.enabled, true);
  assert.equal(karpathySource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(KARPATHY_SOURCE_ID), true);

  assert.ok(raschkaSource, "raschka-x-posts source should exist");
  assert.equal(raschkaSource.name, "Sebastian Raschka X Posts");
  assert.equal(raschkaSource.vendor, "Sebastian Raschka");
  assert.equal(raschkaSource.category, "experts-bloggers");
  assert.equal(raschkaSource.type, "twitter-user-posts");
  assert.equal(raschkaSource.url, "https://x.com/rasbt");
  assert.equal(raschkaSource.enabled, true);
  assert.equal(raschkaSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(RASCHKA_SOURCE_ID), true);

  assert.ok(borisChernySource, "boris-cherny-x-posts source should exist");
  assert.equal(borisChernySource.name, "Boris Cherny X Posts");
  assert.equal(borisChernySource.vendor, "Boris Cherny");
  assert.equal(borisChernySource.category, "experts-bloggers");
  assert.equal(borisChernySource.type, "twitter-user-posts");
  assert.equal(borisChernySource.url, "https://x.com/bcherny");
  assert.equal(borisChernySource.enabled, true);
  assert.equal(borisChernySource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(BORIS_CHERNY_SOURCE_ID), true);

  assert.ok(alphaxivSource, "alphaxiv-x-posts source should exist");
  assert.equal(alphaxivSource.name, "alphaXiv X Posts");
  assert.equal(alphaxivSource.vendor, "alphaXiv");
  assert.equal(alphaxivSource.category, "experts-bloggers");
  assert.equal(alphaxivSource.type, "twitter-user-posts");
  assert.equal(alphaxivSource.url, "https://x.com/askalphaxiv");
  assert.equal(alphaxivSource.enabled, true);
  assert.equal(alphaxivSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(ALPHAXIV_SOURCE_ID), true);

  assert.ok(anatoliKopadzeSource, "anatoli-kopadze-x-posts source should exist");
  assert.equal(anatoliKopadzeSource.name, "Anatoli Kopadze X Posts");
  assert.equal(anatoliKopadzeSource.vendor, "Anatoli Kopadze");
  assert.equal(anatoliKopadzeSource.category, "experts-bloggers");
  assert.equal(anatoliKopadzeSource.type, "twitter-user-posts");
  assert.equal(anatoliKopadzeSource.url, "https://x.com/AnatoliKopadze");
  assert.equal(anatoliKopadzeSource.enabled, true);
  assert.equal(anatoliKopadzeSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(ANATOLI_KOPADZE_SOURCE_ID), true);

  assert.ok(lilianWengSource, "lilian-weng-x-posts source should exist");
  assert.equal(lilianWengSource.name, "Lilian Weng X Posts");
  assert.equal(lilianWengSource.vendor, "Lilian Weng");
  assert.equal(lilianWengSource.category, "experts-bloggers");
  assert.equal(lilianWengSource.type, "twitter-user-posts");
  assert.equal(lilianWengSource.url, "https://x.com/lilianweng");
  assert.equal(lilianWengSource.enabled, true);
  assert.equal(lilianWengSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(LILIAN_WENG_SOURCE_ID), true);

  assert.ok(tiboSource, "tibo-x-posts source should exist");
  assert.equal(tiboSource.name, "Tibo X Posts");
  assert.equal(tiboSource.vendor, "Tibo");
  assert.equal(tiboSource.category, "experts-bloggers");
  assert.equal(tiboSource.type, "twitter-user-posts");
  assert.equal(tiboSource.url, "https://x.com/thsottiaux");
  assert.equal(tiboSource.enabled, true);
  assert.equal(tiboSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(TIBO_SOURCE_ID), true);

  assert.ok(openaiXSource, "openai-x-posts source should exist");
  assert.equal(openaiXSource.name, "OpenAI X Posts");
  assert.equal(openaiXSource.vendor, "OpenAI");
  assert.equal(openaiXSource.category, "experts-bloggers");
  assert.equal(openaiXSource.type, "twitter-user-posts");
  assert.equal(openaiXSource.url, "https://x.com/OpenAI");
  assert.equal(openaiXSource.enabled, true);
  assert.equal(openaiXSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(OPENAI_X_SOURCE_ID), true);

  assert.ok(chatgptXSource, "chatgpt-x-posts source should exist");
  assert.equal(chatgptXSource.name, "ChatGPT X Posts");
  assert.equal(chatgptXSource.vendor, "ChatGPT");
  assert.equal(chatgptXSource.category, "experts-bloggers");
  assert.equal(chatgptXSource.type, "twitter-user-posts");
  assert.equal(chatgptXSource.url, "https://x.com/ChatGPTapp");
  assert.equal(chatgptXSource.enabled, true);
  assert.equal(chatgptXSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(CHATGPT_X_SOURCE_ID), true);

  assert.ok(anthropicXSource, "anthropic-x-posts source should exist");
  assert.equal(anthropicXSource.name, "Anthropic X Posts");
  assert.equal(anthropicXSource.vendor, "Anthropic");
  assert.equal(anthropicXSource.category, "experts-bloggers");
  assert.equal(anthropicXSource.type, "twitter-user-posts");
  assert.equal(anthropicXSource.url, "https://x.com/AnthropicAI");
  assert.equal(anthropicXSource.enabled, true);
  assert.equal(anthropicXSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(ANTHROPIC_X_SOURCE_ID), true);

  assert.ok(claudeXSource, "claude-x-posts source should exist");
  assert.equal(claudeXSource.name, "Claude X Posts");
  assert.equal(claudeXSource.vendor, "Claude");
  assert.equal(claudeXSource.category, "experts-bloggers");
  assert.equal(claudeXSource.type, "twitter-user-posts");
  assert.equal(claudeXSource.url, "https://x.com/claudeai");
  assert.equal(claudeXSource.enabled, true);
  assert.equal(claudeXSource.maxItems, 50);
  assert.equal(PLAZA_SOURCE_IDS.has(CLAUDE_X_SOURCE_ID), true);

  assert.deepEqual(
    getAggregateNavScope("experts-bloggers")?.leafGroups.map((group) => group.id),
    [
      "andrej-karpathy",
      "sebastian-raschka",
      "boris-cherny",
      "anatoli-kopadze",
      "lilian-weng",
      "tibo",
      "openai",
      "chatgpt",
      "anthropic",
      "claude",
      "alphaxiv"
    ]
  );
  assert.deepEqual(
    getAggregateNavScope("experts-bloggers:experts")?.leafGroups.map((group) => group.id),
    ["andrej-karpathy", "sebastian-raschka", "boris-cherny", "anatoli-kopadze", "lilian-weng", "tibo"]
  );
  assert.deepEqual(
    getAggregateNavScope("experts-bloggers:core")?.leafGroups.map((group) => group.id),
    ["openai", "chatgpt", "anthropic", "claude"]
  );
  assert.deepEqual(
    getAggregateNavScope("experts-bloggers:bloggers")?.leafGroups.map((group) => group.id),
    ["alphaxiv"]
  );
});

test("Experts&Bloggers source is wired into fetcher, API, and Dashboard navigation", () => {
  const fetcherSource = readFileSync("src/lib/fetcher.ts", "utf8");
  const apiSource = readFileSync("src/app/api/items/route.ts", "utf8");
  const dashboardSource = readFileSync("src/components/dashboard.tsx", "utf8");

  assert.match(fetcherSource, /fetchTwitterUserPostItems/);
  assert.match(fetcherSource, /source\.type === "twitter-user-posts"/);
  const twitterAdapterSource = readFileSync("src/lib/adapters/twitter-user-posts.ts", "utf8");
  assert.match(twitterAdapterSource, /pinned_tweet_ids_str/);
  assert.match(twitterAdapterSource, /\["tweet", tweetId, "--json"\]/);
  assert.match(twitterAdapterSource, /TWITTER_CHROME_PROFILE/);
  assert.match(twitterAdapterSource, /Profile 1/);

  assert.match(apiSource, /EXPERTS_BLOGGERS_SOURCE_IDS/);
  assert.match(apiSource, /"raschka-x-posts"/);
  assert.match(apiSource, /"boris-cherny-x-posts"/);
  assert.match(apiSource, /"alphaxiv-x-posts"/);
  assert.match(apiSource, /"anatoli-kopadze-x-posts"/);
  assert.match(apiSource, /"lilian-weng-x-posts"/);
  assert.match(apiSource, /"tibo-x-posts"/);
  assert.match(apiSource, /"openai-x-posts"/);
  assert.match(apiSource, /"chatgpt-x-posts"/);
  assert.match(apiSource, /"anthropic-x-posts"/);
  assert.match(apiSource, /"claude-x-posts"/);
  assert.match(apiSource, /sortTwitterUserPostItems/);
  assert.match(apiSource, /view === "experts-bloggers"/);

  assert.match(dashboardSource, /type NavSectionId = .*"experts-bloggers"/s);
  assert.match(dashboardSource, /\{ id: "experts-bloggers", label: "Experts&Bloggers" \}/);
  assert.match(dashboardSource, /EXPERT_BLOGGER_BRANCHES/);
  assert.match(dashboardSource, /EXPERT_BLOGGER_GROUPS/);
  assert.match(dashboardSource, /aggregateScope: "experts-bloggers:experts"/);
  assert.match(dashboardSource, /aggregateScope: "experts-bloggers:core"/);
  assert.match(dashboardSource, /aggregateScope: "experts-bloggers:bloggers"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/rasbt"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/bcherny"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/askalphaxiv"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/AnatoliKopadze"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/lilianweng"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/thsottiaux"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/OpenAI"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/ChatGPTapp"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/AnthropicAI"/);
  assert.match(dashboardSource, /profileUrl: "https:\/\/x\.com\/claudeai"/);
  assert.match(dashboardSource, /feedHeaderProfileLink/);
  assert.match(dashboardSource, /expertProfilePanel/);
  assert.match(dashboardSource, /expertProfileRail/);
  assert.match(dashboardSource, /expertProfileAccent/);
  assert.match(dashboardSource, /expertProfileMatrix/);
  assert.match(dashboardSource, /研究\/工作方向/);
  assert.match(dashboardSource, /label: "身份"/);
  assert.match(dashboardSource, /label: "方向"/);
  assert.match(dashboardSource, /label: "内容"/);
  assert.match(dashboardSource, /Users size=\{15\}/);
  assert.match(dashboardSource, /Sparkles size=\{15\}/);
  assert.match(dashboardSource, /Rss size=\{15\}/);
  assert.match(dashboardSource, /section === "experts-bloggers"/);
});

test("twitter user-posts adapter extracts recent posts from twitter-cli JSON", async () => {
  const adapterPath = path.join(process.cwd(), "src/lib/adapters/twitter-user-posts.ts");
  assert.equal(existsSync(adapterPath), true, "twitter-user-posts adapter should exist");

  const { extractTwitterUserPostItems, mergePinnedTwitterPosts } = await import("../src/lib/adapters/twitter-user-posts");
  const cliJson = JSON.stringify({
    ok: true,
    data: [
      {
        id: "2069465879696576844",
        text: "https://t.co/CGIef5lIBI Read more at https://example.com/blog?x=1&y=2",
        author: { screenName: "EngramLab", name: "Engram" },
        isRetweet: true,
        retweetedBy: "karpathy",
        createdAtISO: "2026-06-23T17:01:29+00:00",
        articleTitle: "Introducing Engram: Scaling compute on your context",
        urls: ["https://example.com/blog?x=1&y=2", "http://x.com/i/article/2069463677733142528"],
        media: [{ type: "photo", url: "https://pbs.twimg.com/media/example.png", width: 1200, height: 800 }],
        metrics: { likes: 1738, retweets: 220, replies: 169, quotes: 151, views: 1707552, bookmarks: 1135 }
      },
      {
        id: "2069547676849557725",
        text: "This is a new paradigm for interacting with Claude that is significantly more inline.",
        author: { screenName: "karpathy", name: "Andrej Karpathy" },
        isRetweet: false,
        createdAtISO: "2026-06-23T22:26:31+00:00",
        metrics: { likes: 22710, retweets: 1876, replies: 1244, quotes: 668, views: 7639779, bookmarks: 13826 },
        quotedTweet: {
          id: "2069468693017268244",
          text: "Introducing Claude Tag, a new way for teams to work with Claude.",
          author: { screenName: "claudeai", name: "Claude" }
        }
      }
    ]
  });

  const items = extractTwitterUserPostItems({
    sourceId: KARPATHY_SOURCE_ID,
    sourceName: "Andrej Karpathy X Posts",
    screenName: "karpathy",
    json: cliJson
  });

  assert.equal(items.length, 2);
  assert.equal(items[0]?.title, "Introducing Engram: Scaling compute on your context");
  assert.equal(items[0]?.canonicalUrl, "https://x.com/karpathy/status/2069465879696576844");
  assert.equal(items[0]?.publishedAt, "2026-06-23T17:01:29+00:00");
  assert.match(items[0]?.excerpt ?? "", /Repost from @EngramLab/);
  assert.match(items[0]?.content ?? "", /Likes: 1738/);
  assert.match(
    items[0]?.content ?? "",
    /<a href="https:\/\/example\.com\/blog\?x=1&amp;y=2" target="_blank" rel="noreferrer" draggable="false">https:\/\/example\.com\/blog\?x=1&amp;y=2<\/a>/
  );
  assert.match(
    items[0]?.content ?? "",
    /<p>Link: <a href="http:\/\/x\.com\/i\/article\/2069463677733142528" target="_blank" rel="noreferrer" draggable="false">http:\/\/x\.com\/i\/article\/2069463677733142528<\/a><\/p>/
  );
  assert.match(items[0]?.content ?? "", /<img src="https:\/\/pbs\.twimg\.com\/media\/example\.png"[^>]*draggable="false"/);
  assert.deepEqual(items[0]?.categories, ["X", "Repost", "Andrej Karpathy"]);

  assert.equal(items[1]?.title, "This is a new paradigm for interacting with Claude that is significantly more inline.");
  assert.equal(items[1]?.canonicalUrl, "https://x.com/karpathy/status/2069547676849557725");
  assert.match(items[1]?.content ?? "", /Quoted @claudeai/);
  assert.deepEqual(items[1]?.categories, ["X", "Original", "Andrej Karpathy"]);

  const raschkaItems = extractTwitterUserPostItems({
    sourceId: RASCHKA_SOURCE_ID,
    sourceName: "Sebastian Raschka X Posts",
    screenName: "rasbt",
    json: cliJson
  });

  assert.equal(raschkaItems[0]?.canonicalUrl, "https://x.com/rasbt/status/2069465879696576844");
  assert.deepEqual(raschkaItems[0]?.categories, ["X", "Repost", "Sebastian Raschka"]);

  const borisChernyItems = extractTwitterUserPostItems({
    sourceId: BORIS_CHERNY_SOURCE_ID,
    sourceName: "Boris Cherny X Posts",
    screenName: "bcherny",
    json: cliJson
  });

  assert.equal(borisChernyItems[0]?.canonicalUrl, "https://x.com/bcherny/status/2069465879696576844");
  assert.deepEqual(borisChernyItems[0]?.categories, ["X", "Repost", "Boris Cherny"]);

  const alphaxivItems = extractTwitterUserPostItems({
    sourceId: ALPHAXIV_SOURCE_ID,
    sourceName: "alphaXiv X Posts",
    screenName: "askalphaxiv",
    json: cliJson
  });

  assert.equal(alphaxivItems[0]?.canonicalUrl, "https://x.com/askalphaxiv/status/2069465879696576844");
  assert.deepEqual(alphaxivItems[0]?.categories, ["X", "Repost", "alphaXiv"]);

  const anatoliKopadzeItems = extractTwitterUserPostItems({
    sourceId: ANATOLI_KOPADZE_SOURCE_ID,
    sourceName: "Anatoli Kopadze X Posts",
    screenName: "AnatoliKopadze",
    json: cliJson
  });

  assert.equal(anatoliKopadzeItems[0]?.canonicalUrl, "https://x.com/AnatoliKopadze/status/2069465879696576844");
  assert.deepEqual(anatoliKopadzeItems[0]?.categories, ["X", "Repost", "Anatoli Kopadze"]);

  const lilianWengItems = extractTwitterUserPostItems({
    sourceId: LILIAN_WENG_SOURCE_ID,
    sourceName: "Lilian Weng X Posts",
    screenName: "lilianweng",
    json: cliJson
  });

  assert.equal(lilianWengItems[0]?.canonicalUrl, "https://x.com/lilianweng/status/2069465879696576844");
  assert.deepEqual(lilianWengItems[0]?.categories, ["X", "Repost", "Lilian Weng"]);

  const tiboItems = extractTwitterUserPostItems({
    sourceId: TIBO_SOURCE_ID,
    sourceName: "Tibo X Posts",
    screenName: "thsottiaux",
    json: cliJson
  });

  assert.equal(tiboItems[0]?.canonicalUrl, "https://x.com/thsottiaux/status/2069465879696576844");
  assert.deepEqual(tiboItems[0]?.categories, ["X", "Repost", "Tibo"]);

  const mergedPosts = mergePinnedTwitterPosts({
    pinnedTweetId: "2054236405308739859",
    pinnedPost: {
      id: "2054236405308739859",
      text: "Reinforcing Recursive Language Models",
      author: { screenName: "askalphaxiv", name: "alphaXiv" },
      isRetweet: false,
      createdAtISO: "2026-05-12T16:24:59+00:00",
      metrics: { likes: 520 },
      media: [{ type: "photo", url: "https://pbs.twimg.com/media/pinned.jpg", width: 1200, height: 800 }]
    },
    posts: [
      {
        id: "2071646290669379988",
        text: "Recent normal post",
        author: { screenName: "askalphaxiv", name: "alphaXiv" },
        isRetweet: false,
        createdAtISO: "2026-06-29T17:25:39+00:00"
      }
    ]
  });
  const pinnedItems = extractTwitterUserPostItems({
    sourceId: ALPHAXIV_SOURCE_ID,
    sourceName: "alphaXiv X Posts",
    screenName: "askalphaxiv",
    json: JSON.stringify({ ok: true, data: mergedPosts })
  });

  assert.equal(pinnedItems[0]?.canonicalUrl, "https://x.com/askalphaxiv/status/2054236405308739859");
  assert.equal(pinnedItems[0]?.title, "Reinforcing Recursive Language Models");
  assert.doesNotMatch(pinnedItems[0]?.excerpt ?? "", /Pinned post/);
  assert.doesNotMatch(pinnedItems[0]?.content ?? "", /Pinned post/);
  assert.match(pinnedItems[0]?.content ?? "", /<img src="https:\/\/pbs\.twimg\.com\/media\/pinned\.jpg"/);
  assert.deepEqual(pinnedItems[0]?.categories, ["X", "Pinned", "Original", "alphaXiv"]);
  assert.equal(pinnedItems[0]?.sourceOrder, 0);
  assert.equal(pinnedItems[1]?.sourceOrder, 1);
});

test("twitter user-posts list order preserves X native pinned/thread ordering", () => {
  const items = [
    {
      id: "newer",
      sourceId: KARPATHY_SOURCE_ID,
      sourceName: "Andrej Karpathy X Posts",
      vendor: "Andrej Karpathy",
      sourceCategory: "experts-bloggers" as const,
      title: "Newer normal post",
      canonicalUrl: "https://x.com/karpathy/status/newer",
      publishedAt: "2026-06-23T22:26:31+00:00",
      submittedAt: null,
      excerpt: null,
      content: null,
      summary: null,
      whyItMatters: null,
      action: null,
      tags: ["experts-bloggers", "X"],
      importance: 1,
      readAt: null,
      starred: false,
      isNewSinceBrief: false,
      sourceOrder: 1,
      createdAt: "2026-06-30T00:00:00.000Z"
    },
    {
      id: "pinned",
      sourceId: KARPATHY_SOURCE_ID,
      sourceName: "Andrej Karpathy X Posts",
      vendor: "Andrej Karpathy",
      sourceCategory: "experts-bloggers" as const,
      title: "Pinned native first post",
      canonicalUrl: "https://x.com/karpathy/status/pinned",
      publishedAt: "2026-06-23T17:01:29+00:00",
      submittedAt: null,
      excerpt: null,
      content: null,
      summary: null,
      whyItMatters: null,
      action: null,
      tags: ["experts-bloggers", "X"],
      importance: 1,
      readAt: null,
      starred: false,
      isNewSinceBrief: false,
      sourceOrder: 0,
      createdAt: "2026-06-30T00:00:00.000Z"
    }
  ];

  assert.deepEqual(
    sortTwitterUserPostItems(items).map((item) => item.id),
    ["pinned", "newer"]
  );
});
