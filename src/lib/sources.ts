import { HUGGINGFACE_DAILY_RECENT_DAYS, HUGGINGFACE_DAILY_TARGET_ITEMS_PER_DAY } from "./huggingface-display";
import type { Source } from "./types";

export const REMOVED_SOURCE_IDS = new Set([
  "deepseek-news",
  "x-karpathy",
  "openreview-openai",
  "openreview-anthropic",
  "openreview-google-deepmind",
  "openreview-meta-ai",
  "openreview-microsoft",
  "openreview-stanford",
  "openreview-mit",
  "openreview-cmu",
  "openreview-uc-berkeley",
  "openreview-tsinghua",
  "openreview-peking"
]);

const AI_VENDOR_INCLUDE_PATTERNS = [
  "model|models|模型|大模型|LLM|VLM|MoE|SOTA|推理|多模态|视觉",
  "agent|智能体|coding|coder|code|OpenClaw|AutoGLM|AutoClaw|CogAgent",
  "open source|opensource|开源|GitHub|github\\.com",
  "research|paper|technical report|研究|论文|报告"
];

const AI_VENDOR_EXCLUDE_PATTERNS = [
  "changelog|change log|release notes|更新日志|变更日志",
  "财报|业绩|财务|investor|relations|stock|shareholder|IPO",
  "公告|公示|备案|许可证|营业执照|terms|privacy",
  "活动|大会|峰会|直播|webinar|event|meetup|招聘|careers|campus",
  "partner|customer|case study|enterprise case|客户案例|合作伙伴|营销"
];

const ANTHROPIC_RESEARCH_EXCLUDE_PATTERNS = [
  "https://www\\.anthropic\\.com/research/team/",
  "^Alignment$",
  "^Economic Research$",
  "^Interpretability$",
  "^Societal Impacts$"
];

const OPENAI_RESEARCH_INDEX_INCLUDE_PATTERNS = [
  "LifeSciBench|chemist|medicinal chemistry|biology|life science",
  "model behavior|deployment simulation|geometry|mathematics|third party evaluations",
  "Dreaming|memory|GPT-Rosalind|Rosalind Biodefense|voice intelligence|System Card"
];

const OPENAI_RESEARCH_INDEX_EXCLUDE_PATTERNS = [
  "Partner Network|Academy courses|Codex for|Oracle cloud|customer|case study",
  "BBVA|Nextdoor|Endava|Wasmer|Preply|LSEG|Notion|Travelers",
  "puts AI at the core|redesigning software delivery|build without limits|runtime for the edge"
];

const ARXIV_MAX_ITEMS = 50;

function arxivPapersSource(input: { id: string; label: string; category: string }): Source {
  return {
    id: input.id,
    name: `arXiv / ${input.label}`,
    vendor: "arXiv",
    category: "research",
    type: "arxiv-papers",
    url: `https://export.arxiv.org/api/query?search_query=cat:${input.category}&sortBy=submittedDate&sortOrder=descending&max_results=${ARXIV_MAX_ITEMS}`,
    enabled: true,
    maxItems: ARXIV_MAX_ITEMS
  };
}

function mathPublicationSource(input: {
  id: string;
  name: string;
  vendor: string;
  type: Source["type"];
  url: string;
  maxItems?: number;
}): Source {
  return {
    id: input.id,
    name: input.name,
    vendor: input.vendor,
    category: "research",
    type: input.type,
    url: input.url,
    enabled: true,
    maxItems: input.maxItems ?? 20
  };
}

export const DEFAULT_SOURCES: Source[] = [
  {
    id: "openai-research-index",
    name: "OpenAI Research Index",
    vendor: "OpenAI",
    category: "research",
    type: "rss",
    url: "https://openai.com/news/rss.xml",
    enabled: true,
    maxItems: 12,
    includeCategories: ["Research", "Safety"],
    excludeCategories: ["Company", "AI Adoption", "Global Affairs", "Applied AI"],
    includeTextPatterns: OPENAI_RESEARCH_INDEX_INCLUDE_PATTERNS,
    excludeTextPatterns: OPENAI_RESEARCH_INDEX_EXCLUDE_PATTERNS
  },
  {
    id: "openai-news",
    name: "OpenAI News",
    vendor: "OpenAI",
    category: "news",
    type: "rss",
    url: "https://openai.com/news/rss.xml",
    enabled: true
  },
  {
    id: "openai-status",
    name: "OpenAI Status",
    vendor: "OpenAI",
    category: "status",
    type: "rss",
    url: "https://status.openai.com/history.rss",
    enabled: true
  },
  {
    id: "openai-api-changelog",
    name: "OpenAI API Changelog",
    vendor: "OpenAI",
    category: "api",
    type: "html-list",
    url: "https://developers.openai.com/api/docs/changelog",
    enabled: true,
    includePathPrefixes: ["/api/docs/changelog"]
  },
  {
    id: "openai-codex-blog",
    name: "Codex Blog",
    vendor: "OpenAI",
    category: "coding-agent",
    type: "openai-developers-blog",
    url: "https://developers.openai.com/blog",
    enabled: true,
    maxItems: 12
  },
  {
    id: "openai-codex-changelog",
    name: "Codex Changelog",
    vendor: "OpenAI",
    category: "coding-agent",
    type: "openai-codex-changelog",
    url: "https://developers.openai.com/codex/changelog",
    enabled: true,
    maxItems: 12
  },
  {
    id: "openai-codex-releases",
    name: "Codex GitHub Releases",
    vendor: "OpenAI",
    category: "coding-agent",
    type: "rss",
    url: "https://github.com/openai/codex/releases.atom",
    enabled: true,
    maxItems: 3
  },
  {
    id: "anthropic-research",
    name: "Anthropic Research",
    vendor: "Anthropic",
    category: "research",
    type: "html-list",
    url: "https://www.anthropic.com/research",
    enabled: true,
    maxItems: 12,
    includePathPrefixes: ["/research/"],
    excludeTextPatterns: ANTHROPIC_RESEARCH_EXCLUDE_PATTERNS
  },
  {
    id: "anthropic-news",
    name: "Anthropic News",
    vendor: "Anthropic",
    category: "news",
    type: "html-list",
    url: "https://www.anthropic.com/news",
    enabled: true,
    includePathPrefixes: ["/news/"]
  },
  {
    id: "claude-platform-release-notes",
    name: "Claude Platform Release Notes",
    vendor: "Anthropic",
    category: "api",
    type: "html-list",
    url: "https://platform.claude.com/docs/en/release-notes/overview",
    enabled: true,
    includePathPrefixes: ["/docs/en/release-notes/"]
  },
  {
    id: "claude-blog-posts",
    name: "Claude Blog Posts",
    vendor: "Anthropic",
    category: "coding-agent",
    type: "claude-blog",
    url: "https://claude.com/blog",
    enabled: true,
    maxItems: 12
  },
  {
    id: "claude-code-changelog",
    name: "Claude Code Changelog",
    vendor: "Anthropic",
    category: "coding-agent",
    type: "markdown-changelog",
    url: "https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md",
    enabled: true
  },
  {
    id: "claude-status",
    name: "Claude Status",
    vendor: "Anthropic",
    category: "status",
    type: "rss",
    url: "https://status.claude.com/history.rss",
    enabled: true
  },
  {
    id: "github-trending",
    name: "GitHub Trending",
    vendor: "GitHub",
    category: "github-trending",
    type: "github-trending",
    url: "https://github.com/trending?since=daily",
    enabled: true
  },
  {
    id: "huggingface-daily-papers",
    name: "HuggingFace Daily Papers",
    vendor: "HuggingFace",
    category: "research",
    type: "huggingface-papers",
    url: "https://huggingface.co/papers",
    enabled: true,
    maxItems: HUGGINGFACE_DAILY_RECENT_DAYS * HUGGINGFACE_DAILY_TARGET_ITEMS_PER_DAY
  },
  {
    id: "huggingface-trending-papers",
    name: "HuggingFace Trending Papers",
    vendor: "HuggingFace",
    category: "research",
    type: "huggingface-papers",
    url: "https://huggingface.co/papers/trending",
    enabled: true,
    maxItems: 20
  },
  arxivPapersSource({ id: "arxiv-cs-ai", label: "cs.AI", category: "cs.AI" }),
  arxivPapersSource({ id: "arxiv-cs-lg", label: "cs.LG", category: "cs.LG" }),
  arxivPapersSource({ id: "arxiv-cs-cl", label: "cs.CL", category: "cs.CL" }),
  arxivPapersSource({ id: "arxiv-cs-cv", label: "cs.CV", category: "cs.CV" }),
  arxivPapersSource({ id: "arxiv-cs-ro", label: "cs.RO", category: "cs.RO" }),
  arxivPapersSource({ id: "arxiv-stat-ml", label: "stat.ML", category: "stat.ML" }),
  {
    id: "openreview-iclr-2026",
    name: "OpenReview / ICLR 2026",
    vendor: "OpenReview",
    category: "research",
    type: "openreview-papers",
    url: "https://api2.openreview.net/notes?content.venueid=ICLR.cc/2026/Conference&content.venue=ICLR%202026%20Oral&sort=tmdate:desc&limit=50",
    enabled: true,
    maxItems: 50
  },
  {
    id: "openreview-neurips-2025",
    name: "OpenReview / NeurIPS 2025",
    vendor: "OpenReview",
    category: "research",
    type: "openreview-papers",
    url: "https://api2.openreview.net/notes?content.venueid=NeurIPS.cc/2025/Conference&content.venue=NeurIPS%202025%20oral&sort=tmdate:desc&limit=50",
    enabled: true,
    maxItems: 50
  },
  {
    id: "openreview-icml-2025",
    name: "OpenReview / ICML 2025",
    vendor: "OpenReview",
    category: "research",
    type: "openreview-papers",
    url: "https://api2.openreview.net/notes?content.venueid=ICML.cc/2025/Conference&content.venue=ICML%202025%20oral&sort=tmdate:desc&limit=50",
    enabled: true,
    maxItems: 50
  },
  {
    id: "openreview-colm-2025",
    name: "OpenReview / COLM 2025",
    vendor: "OpenReview",
    category: "research",
    type: "openreview-papers",
    url: "https://api2.openreview.net/notes?content.venueid=colmweb.org/COLM/2025/Conference&content.venue=COLM%202025&sort=tmdate:desc&limit=50",
    enabled: true,
    maxItems: 50
  },
  {
    id: "stanford-ai-lab-blog",
    name: "Stanford AI Lab Blog",
    vendor: "Stanford AI Lab",
    category: "research",
    type: "stanford-ai-lab-blog",
    url: "http://ai.stanford.edu/blog/",
    enabled: true,
    maxItems: 12
  },
  {
    id: "bair-blog",
    name: "BAIR Blog",
    vendor: "BAIR",
    category: "research",
    type: "bair-blog",
    url: "https://bair.berkeley.edu/blog/",
    enabled: true,
    maxItems: 12
  },
  {
    id: "cmu-ml-blog",
    name: "CMU ML Blog",
    vendor: "CMU ML",
    category: "research",
    type: "cmu-ml-blog",
    url: "https://blog.ml.cmu.edu/",
    enabled: true,
    maxItems: 12
  },
  {
    id: "mila-blog",
    name: "Mila Blog",
    vendor: "Mila",
    category: "research",
    type: "mila-blog",
    url: "https://mila.quebec/en/research/blog",
    enabled: true,
    maxItems: 12
  },
  {
    id: "vector-publications",
    name: "Vector Institute Publications",
    vendor: "Vector Institute",
    category: "research",
    type: "vector-publications",
    url: "https://vectorinstitute.ai/research-talent/publications/",
    enabled: true,
    maxItems: 20
  },
  mathPublicationSource({
    id: "optimization-online",
    name: "Optimization Online",
    vendor: "Optimization Online",
    type: "optimization-online",
    url: "https://optimization-online.org/feed/",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "mathprog-journal",
    name: "Mathematical Programming",
    vendor: "Mathematical Optimization Society",
    type: "academic-toc",
    url: "https://link.springer.com/journal/10107/online-first",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "siam-optimization",
    name: "SIAM Journal on Optimization",
    vendor: "SIAM",
    type: "academic-toc",
    url: "https://epubs.siam.org/action/showFeed?jc=sjope8&type=etoc&feed=rss",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "informs-mor",
    name: "Mathematics of Operations Research",
    vendor: "INFORMS",
    type: "academic-toc",
    url: "https://pubsonline.informs.org/action/showFeed?jc=moor&type=etoc&feed=rss",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "jmlr-papers",
    name: "JMLR Papers",
    vendor: "JMLR",
    type: "jmlr-papers",
    url: "https://www.jmlr.org/papers/v26/",
    maxItems: 30
  }),
  mathPublicationSource({
    id: "pmlr-colt",
    name: "PMLR / COLT",
    vendor: "PMLR",
    type: "pmlr-proceedings",
    url: "https://proceedings.mlr.press/v291/",
    maxItems: 50
  }),
  mathPublicationSource({
    id: "pmlr-alt",
    name: "PMLR / ALT",
    vendor: "PMLR",
    type: "pmlr-proceedings",
    url: "https://proceedings.mlr.press/v313/",
    maxItems: 50
  }),
  mathPublicationSource({
    id: "pmlr-aistats",
    name: "PMLR / AISTATS",
    vendor: "PMLR",
    type: "pmlr-proceedings",
    url: "https://proceedings.mlr.press/v258/",
    maxItems: 50
  }),
  mathPublicationSource({
    id: "pmlr-uai",
    name: "PMLR / UAI",
    vendor: "PMLR",
    type: "pmlr-proceedings",
    url: "https://proceedings.mlr.press/v286/",
    maxItems: 50
  }),
  mathPublicationSource({
    id: "statistics-computing",
    name: "Statistics and Computing",
    vendor: "Springer",
    type: "academic-toc",
    url: "https://link.springer.com/journal/11222/volumes-and-issues/36-3",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "siam-sisc",
    name: "SIAM Journal on Scientific Computing",
    vendor: "SIAM",
    type: "academic-toc",
    url: "https://epubs.siam.org/action/showFeed?jc=sjoce3&type=etoc&feed=rss",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "siam-sinum",
    name: "SIAM Journal on Numerical Analysis",
    vendor: "SIAM",
    type: "academic-toc",
    url: "https://epubs.siam.org/action/showFeed?jc=sinum&type=etoc&feed=rss",
    maxItems: 20
  }),
  mathPublicationSource({
    id: "siam-mds",
    name: "SIAM Journal on Mathematics of Data Science",
    vendor: "SIAM",
    type: "academic-toc",
    url: "https://epubs.siam.org/action/showFeed?jc=simods&type=etoc&feed=rss",
    maxItems: 20
  }),
  {
    id: "qwen-blog-rss",
    name: "Qwen Blog Legacy",
    vendor: "Qwen",
    category: "model",
    type: "rss",
    url: "https://qwenlm.github.io/blog/index.xml",
    enabled: true,
    maxItems: 12,
    includeTextPatterns: ["Qwen|QwQ|QwenLM|model|模型|agent|open source|开源|research|paper|report", ...AI_VENDOR_INCLUDE_PATTERNS],
    excludeTextPatterns: AI_VENDOR_EXCLUDE_PATTERNS
  },
  {
    id: "qwen-research",
    name: "Qwen Research",
    vendor: "Qwen",
    category: "research",
    type: "qwen-research",
    url: "https://qwen.ai/api/v2/article/retrieval?type=qwen_ai&language=en-US",
    enabled: true,
    maxItems: 12,
    excludeTextPatterns: ["qwen\\.ai/research/[a-f0-9]{40}\\b"]
  },
  {
    id: "kimi-blog",
    name: "Kimi Blog",
    vendor: "Kimi",
    category: "research",
    type: "kimi-blog",
    url: "https://www.kimi.com/blog/",
    enabled: true,
    maxItems: 12
  },
  {
    id: "minimax-blog",
    name: "MiniMax Blog",
    vendor: "MiniMax",
    category: "research",
    type: "html-list",
    url: "https://www.minimaxi.com/blog",
    enabled: true,
    maxItems: 10,
    includePathPrefixes: ["/blog/"]
  },
  {
    id: "zhipu-model-family",
    name: "ZhipuAI Flagship Models",
    vendor: "ZhipuAI",
    category: "model",
    type: "zhipu-model-family",
    url: "https://chat.z.ai/",
    enabled: true,
    maxItems: 8
  },
  {
    id: "zhipu-news",
    name: "ZhipuAI News",
    vendor: "ZhipuAI",
    category: "model",
    type: "html-list",
    url: "https://www.zhipuai.cn/news",
    enabled: true,
    maxItems: 8,
    includeHostnames: [
      "github.com",
      "autoglm.zhipuai.cn",
      "autoglm.z.ai",
      "cogagent.aminer.cn",
      "modelscope.cn",
      "modelers.cn",
      "agent.aminer.cn"
    ],
    includeTextPatterns: ["GLM|Zhipu|智谱|CogAgent|AutoGLM|AutoClaw|OpenClaw|zai-org", ...AI_VENDOR_INCLUDE_PATTERNS],
    excludeTextPatterns: [...AI_VENDOR_EXCLUDE_PATTERNS, "CogAgent|20241220|THUDM/CogAgent|cogagent\\.aminer"]
  },
  {
    id: "minimax-news",
    name: "MiniMax News",
    vendor: "MiniMax",
    category: "model",
    type: "html-list",
    url: "https://www.minimax.io/news",
    enabled: true,
    maxItems: 8,
    includePathPrefixes: ["/news/"],
    includeHostnames: ["code.minimax.io"],
    includeTextPatterns: ["Hailuo|Speech|Music|MiniMax Code|M3|M2\\.7|M2\\.5", ...AI_VENDOR_INCLUDE_PATTERNS],
    excludeTextPatterns: [...AI_VENDOR_EXCLUDE_PATTERNS, "^audio\\s", "^www\\.minimax\\.io\\s", "https://www\\.minimax\\.io$"]
  }
];
