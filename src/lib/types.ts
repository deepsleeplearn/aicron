export type SourceType =
  | "rss"
  | "bair-blog"
  | "cmu-ml-blog"
  | "html-list"
  | "markdown-changelog"
  | "github-trending"
  | "openai-developers-blog"
  | "openai-codex-changelog"
  | "claude-blog"
  | "qwen-research"
  | "kimi-blog"
  | "mila-blog"
  | "stanford-ai-lab-blog"
  | "huggingface-papers"
  | "arxiv-papers"
  | "openreview-papers"
  | "optimization-online"
  | "jmlr-papers"
  | "pmlr-proceedings"
  | "academic-toc"
  | "vector-publications"
  | "twitter-user-posts"
  | "codex-radar"
  | "zhipu-model-family";

export type SourceCategory =
  | "news"
  | "api"
  | "coding-agent"
  | "github-trending"
  | "experts-bloggers"
  | "tools"
  | "status"
  | "research"
  | "model";

export type Source = {
  id: string;
  name: string;
  vendor: string;
  category: SourceCategory;
  type: SourceType;
  url: string;
  enabled: boolean;
  includePathPrefixes?: string[];
  includeHostnames?: string[];
  includeCategories?: string[];
  excludeCategories?: string[];
  includeTextPatterns?: string[];
  excludeTextPatterns?: string[];
  maxItems?: number;
};

export type RawItem = {
  sourceId: string;
  sourceName: string;
  title: string;
  canonicalUrl: string;
  publishedAt?: string | null;
  submittedAt?: string | null;
  content?: string | null;
  excerpt?: string | null;
  categories?: string[];
  sourceOrder?: number | null;
};

export type RankedItem = {
  importance: number;
  tags: string[];
};

export type StoredItem = {
  id: string;
  sourceId: string;
  sourceName: string;
  vendor: string;
  sourceCategory: SourceCategory;
  title: string;
  canonicalUrl: string;
  publishedAt: string | null;
  submittedAt: string | null;
  excerpt: string | null;
  content: string | null;
  summary: string | null;
  whyItMatters: string | null;
  action: string | null;
  tags: string[];
  importance: number;
  readAt: string | null;
  starred: boolean;
  isNewSinceBrief: boolean;
  sourceOrder: number | null;
  createdAt: string;
};

export type FetchHealth = {
  sourceId: string;
  status: "ok" | "error";
  message?: string;
  fetchedCount: number;
  durationMs: number;
};

export type AssistantMessage = {
  role: "user" | "assistant";
  content: string;
};
