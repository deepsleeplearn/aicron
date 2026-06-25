# AICron 项目需求文档

最后更新：2026-06-23

## 1. 产品定位

AICron 是一个本地优先的 AI 信息早报工作台，服务对象是偏技术的 AI 从业者、算法工程师和程序员。

第一版目标不是通用 RSS 阅读器，而是每天快速浏览 OpenAI、Anthropic、Qwen、Kimi、MiniMax、智谱 AI、Codex、Claude Code、Hugging Face Papers、arXiv Papers、OpenReview 顶会、Labs、Mathematics、Github Hot等技术更新，并支持站内阅读和后续与本地 Codex 讨论文章内容。

项目名称含义：AICron = AI Information Cron，由早期展示名 AInfoCron 简化而来。

Logo 设计原则：

- Logo 需要服务于“本地 AI 信息定时工作台”的定位，优先表达信息聚合、定时刷新、技术监测，而不是泛 AI 营销感。
- 当前主界面使用 `/logo-prototypes` 中 D 方案 Info Radar 的可编辑 CSS 标识，字标为 AICron。
- Logo 应优先使用可维护的 CSS、SVG 或文字标实现，避免依赖不可编辑的位图。

## 2. 基本原则

- 本地优先：第一版运行在本地 Mac，后续再考虑云端化。
- 白色底色：默认浅色、克制、信息密度适中，不使用深色主题作为主视觉。
- 工作台而非营销页：左侧导航、中间内容区，选中文章后右侧出现 Codex 文章助手。
- 内容质量优先：只展示技术文档、观点、研究、模型、Agent、开源、Coder、状态和重要变更。
- 避免信息噪音：过滤财报、公示、活动营销、普通 changelog 大量流水内容。
- 来源归属优先：文章从哪个源来，就放在对应源下面。
- 端口稳定：本地开发优先使用 3000 端口，除非必要不要频繁换端口。

## 3. 导航结构

左侧导航采用一级导航 + 必要子导航。只有有子导航的一级项才可折叠；没有子导航的一级项点击后直接切换页面。

父级导航预览规则：

- 点击有子导航的一级导航时，中间内容区不再沿用上一次点击过的叶子栏目，而是使用与Plaza一致的 coverflow 展示样式，展示该一级导航下所有最底层叶子栏目中各自排序后的前 2 篇文章或博客。
- 点击有子导航的二级导航时，中间内容区使用与Plaza一致的 coverflow 展示样式，展示该二级导航下所有最底层叶子栏目中各自排序后的前 3 篇文章或博客。
- 点击没有子导航的导航项，或者点击任意最底层叶子导航，保持原来的列表/卡片展示方式。
- 父级预览中每个叶子栏目内部先按优先级降序排序，同优先级内按发布时间倒序排序，最新内容靠前。
- 后续新增导航时，只要它有子导航，就必须在共享导航聚合配置中声明其叶子栏目，保证父级点击自动进入聚合预览，不出现“父级仍显示上一次叶子栏目内容”的状态残留。

当前一级导航：

- Plaza
  - 不展示子导航。
  - 展示除 Github Hot外，各最底层栏目中的最新一篇文章或博客。
  - 使用 coverflow 环形卡片动效。
  - coverflow 自动转动必须按“每张卡经过中心的时间一致”计算，不允许因当前栏目卡片数量不同导致单卡移动速度明显不同；当前单卡间隔约 8 秒。
- Developers
  - T1（可折叠二级导航）
    - Anthropic
    - OpenAI
  - T2（可折叠二级导航）
    - Qwen
      - Blog
      - Research
    - Kimi
    - MiniMax
    - ZhipuAI
- Coder
  - Codex
    - Blog
    - Changelog
  - Claude Code
- Github Hot
  - 不展示子导航。
  - 当前 GitHub Trending 项目，使用项目卡片展示。
- Papers
  - HuggingFace
    - Daily Papers
    - Trending Papers
  - arXiv
    - cs.AI
    - cs.LG
    - cs.CL
    - cs.CV
    - cs.RO
    - stat.ML
  - OpenReview
    - ICLR
    - NeurIPS
    - ICML
    - COLM
- Labs
  - Stanford AI Lab
  - BAIR
  - CMU ML
  - Mila
  - Vector Institute
- Mathematics
  - Optimization
    - Optimization Online
    - Mathematical Programming
    - SIAM Optimization
    - INFORMS MOR
  - Learning Theory
    - JMLR
    - COLT
    - ALT
  - Statistics
    - AISTATS
    - UAI
    - Statistics and Computing
  - Applied Math
    - SIAM
      - SISC
      - SINUM
      - MDS

## 4. 内容源规则

### OpenAI

- Developers / OpenAI 只放 `https://openai.com/research/index/` 对应的研究、模型、安全、科学类内容。
- 不把 OpenAI 普通新闻、客户案例、营销内容混入 OpenAI 研究栏目。
- OpenAI 研究列表通过 RSS 或索引页拿到标题和链接后，需要继续拉取原文详情页正文，写入 `item_content`，用于站内阅读。
- Codex 相关内容放到 Coder / Codex 下，不放到 OpenAI 厂商页。

### Anthropic

- Developers / Anthropic 放 `https://www.anthropic.com/research` 下的研究内容。
- Claude Code 相关内容不放到 Anthropic 厂商页，应放到 Coder / Claude Code。

### Qwen

- Qwen 是可折叠厂商项，分为：
  - Blog：旧版 QwenLM Blog。
  - Research：新版 `https://qwen.ai/research` 相关内容。
- Qwen Research 必须抓取新版 research 源中的最新内容。
- 内容展示前要清理样式片段，例如 `<style>...</style>` 这类页面级 CSS 不应进入摘要或正文。

### MiniMax

- MiniMax 放 `https://www.minimaxi.com/blog` 下的内容。
- 只展示模型、Agent、开源、研究、技术类内容。

### Kimi

- Kimi 放 `https://www.kimi.com/blog/` 下的内容。
- Kimi 位于 Developers / T2。
- Kimi 必须拉取该页面中罗列的文章或博客链接；如果页面通过脚本渲染文章数据，使用专用 adapter 从页面数据中恢复 `/blog/...` 或 `/research/...` 文章。
- 不允许因为通用关键词过滤导致 Kimi 官方文章列表为空；该栏目以页面中真实文章/博客链接为准，不走通用 include/exclude 文本过滤。

### ZhipuAI

- ZhipuAI 下展示官网首页中罗列的旗舰模型家族。
- 展示目标包括 GLM-5.2、GLM-5V-Turbo、GLM-Image、GLM-OCR、GLM-ASR、GLM-TTS 等官网旗舰模型卡片。
- 每个模型的详细说明优先使用对应官方文档，例如 GLM-5.2 使用 `https://docs.bigmodel.cn/cn/guide/models/text/glm-5.2`。

### DeepSeek

- DeepSeek 相关内容已从当前版本移除。

### Labs

- Labs 是左侧一级导航，用于归档高校 AI 实验室发布的研究博客和技术文章。
- 第一版 Labs 包含 Stanford AI Lab、BAIR、CMU ML、Mila 和 Vector Institute。
- Stanford AI Lab 只拉取列表页 `http://ai.stanford.edu/blog/` 的 `Posts` 区域内容，即 `.posts .post-teaser` 文章卡片；不要把导航、分类入口、首页自身链接或其他页面 chrome 混入文章列表。
- Stanford AI Lab 使用专用 `stanford-ai-lab-blog` adapter，不使用通用 `html-list` adapter；不要默认使用其 `feed.xml`，该 RSS 完整下载较慢，容易拖慢刷新流程。
- Stanford AI Lab 的每篇文章需要标明官网侧边栏中的分类标签：Conferences、Computer Vision、Robotics、NLP、Machine Learning、Reinforcement Learning。分类通过对应分类页 `/blog/conferences`、`/blog/vision`、`/blog/robotics`、`/blog/nlp`、`/blog/ml`、`/blog/rl` 反查文章链接后写入可见 tags；分类页未覆盖的文章，用标题和摘要中的明显词做保守兜底，保证每篇文章至少显示一个上述分类。
- Stanford AI Lab 列表页拿到标题和链接后，应进入现有站内详情补全流程；点击文章时可继续拉取原文详情页正文，用于站内阅读和右侧 Codex 对话。
- BAIR 放 `https://bair.berkeley.edu/blog/` 中的文章。
- BAIR 使用专用 `bair-blog` adapter 抓取博客列表页 `.posts .post` 文章卡片；虽然官网提供 RSS，但 RSS 中会带固定时分，列表页只展示日期，因此应以博客列表页日期为准，保留 `May 8, 2026` 这类日期-only 值，不 mock 发布时间。
- BAIR 文章点击进入站内阅读页时，走现有详情补全流程，保留原文中的图片、图注、表格、代码块和正文链接。
- CMU ML 放 `https://blog.ml.cmu.edu/` 中的文章。
- CMU ML 使用专用 `cmu-ml-blog` adapter 抓取 ML@CMU 官方博客。页面是 WordPress，adapter 优先解析首页 JSON-LD 中的 `Blog.blogPost` 结构化数据，缺失时回退解析文章卡片 DOM。
- CMU ML 的发布时间展示保留日期-only 值，例如 `June 17, 2026`，不根据 JSON-LD 中的具体时分 mock 页面没有展示的时间。
- CMU ML 文章点击进入站内阅读页时，走现有详情补全流程，保留原文中的图片、图注、表格、代码块、数学内容和正文链接。
- Mila 放 `https://mila.quebec/en/research/blog` 中的文章。
- Mila 使用专用 `mila-blog` adapter 抓取 Drupal 文章 teaser `.node--type-article.node--view-mode-teaser`，从卡片中解析标题、链接、日期和作者。
- Mila 的发布时间展示保留日期-only 值，例如 `December 19, 2025`，不 mock 页面没有展示的具体时分。
- Mila 列表卡片没有单独摘要时，可使用作者信息作为 excerpt 兜底；文章点击进入站内阅读页时，走现有详情补全流程，保留原文中的图片、正文结构和正文链接。
- Vector Institute 放 `https://vectorinstitute.ai/research-talent/publications/` 中的研究论文条目，归到 Labs / Vector Institute。
- Vector Institute 使用专用 `vector-publications` adapter 抓取 WordPress `article.tease-publications` 论文卡片，从卡片中解析论文标题、外部论文链接、作者、年份和来源信息。
- Vector Institute 页面只展示年份时，发布时间保留 `2025` 这类 year-only 值，不 mock 月日或具体时分；前端应直接显示年份。
- Vector Institute 条目通常指向 Cell、Nature、arXiv、OpenReview、PMLR、RSC 等外部论文页面。该源只抓取 Vector 列表页卡片元信息，不继续爬取外部论文页正文；站内阅读页应按“源未提供完整正文”处理，只展示摘要/元信息并提供“打开原文”。
- Labs 后续可扩展 MIT CSAIL、CMU AI、Princeton NLP 等高校实验室；新增实验室应优先复用 RSS adapter，但如果 RSS 会引入页面没有展示的 mock 时分、缺失卡片摘要或混入无关内容，应新增专用 adapter。

### Codex

- Coder / Codex 展开为：
- Blog：`https://developers.openai.com/blog`
- Changelog：`https://developers.openai.com/codex/changelog`
- Blog 列表页抓到文章标题和链接后，需要继续拉取标题对应的原文详情页正文，写入 `item_content`，用于站内阅读。
- Changelog 只展示重要变更，不展示大量无价值流水。
- Changelog 条目正文可能短于普通文章，但只要已从官方 changelog 条目中抓到正文，就应在站内阅读页展示，不应被普通文章的长度阈值隐藏。

### Claude Code

- Coder / Claude Code 放 `https://claude.com/blog` 中罗列的 posts。
- 不直接展示大批量 Claude Code changelog。

### Github Hot

- Github Hot使用当前 GitHub Trending。
- 每页展示 8 个项目。
- 项目卡片需要适当放大填充主内容区，但分页选择必须保持在当前屏幕中可见，避免分页下方出现大面积空白。
- 卡片需突出：
  - 项目名
  - 简介
  - 语言
  - Stars
  - Forks
  - stars today
  - 仓库直达链接
- 热榜展示不使用普通文章列表排版。

### Papers

- Papers 是左侧一级导航。
- Papers / HuggingFace 下分为：
  - Daily Papers：抓取 `https://huggingface.co/papers/date/YYYY-MM-DD` 最近 7 天日期页中的 Hugging Face Daily Papers。
  - Trending Papers：抓取 `https://huggingface.co/papers/trending` 中的 Hugging Face Trending Papers。
- Papers / arXiv 是 Papers 下的二级标题，下面按 arXiv 官方类别作为三级导航：
  - cs.AI：Artificial Intelligence。
  - cs.LG：Machine Learning。
  - cs.CL：Computation and Language。
  - cs.CV：Computer Vision。
  - cs.RO：Robotics。
  - stat.ML：Statistics / Machine Learning。
- Papers / OpenReview 是 Papers 下的二级标题，下面按知名顶会作为三级导航。
- 第一版 OpenReview 顶会源按会议 venue 拉取近期公开条目：
  - ICLR：从 `https://openreview.net/group?id=ICLR.cc/2026/Conference#tab-accept-oral` 对应的 Accept Oral 列表拉取，只保留 `content.venue=ICLR 2026 Oral` 的前 50 篇论文。
  - NeurIPS：只保留 `content.venue=NeurIPS 2025 oral` 的前 50 篇论文。
  - ICML：只保留 `content.venue=ICML 2025 oral` 的前 50 篇论文。
  - COLM：OpenReview 当前未区分 oral/poster，`content.venue` 统一为 `COLM 2025`；先保留该 accepted venue 的前 50 篇论文。
- ACL 暂不启用空栏目；常规 OpenReview ACL 2025/2024 venue 和 submission 查询未返回主会论文，待确认可稳定返回文章的 venueid 或 API 查询后再加入。
- OpenReview adapter 需要解析 title、TLDR、abstract、authors、keywords、venue、forum/pdf 链接，并生成站内可阅读内容。
- OpenReview 不再按机构筛选；OpenReview 二级标题下必须展开会议三级导航，点击具体会议后展示该会议对应论文。
- 两个 Hugging Face 论文源使用专用 `huggingface-papers` adapter，列表页用于发现论文条目，详情页用于补全摘要、提交时间、发布时间、arXiv、GitHub 和 Upvote 等信息。
- Hugging Face Daily Papers 抓取并展示最近一周论文，不只展示当天论文；每个日期页最多保留 20 条，整源上限应覆盖 7 天内容；展示时按时间倒序排列，排序时间优先使用 `submit`，没有 `submit` 时再使用 `publish`。
- Hugging Face Trending Papers 展示最新趋势论文，按提交时间倒序展示；入库时仍使用 `source_order` 保存每次抓取的页面顺序，作为同一提交时间下的稳定兜底排序。
- arXiv 使用专用 `arxiv-papers` adapter，通过 `https://export.arxiv.org/api/query?search_query=cat:<category>&sortBy=submittedDate&sortOrder=descending&max_results=50` 拉取各三级分类最近提交的论文。
- arXiv 条目只保留 `arxiv:primary_category` 与当前三级分类一致的论文；如果论文还带有其他 arXiv category，可作为可见标签展示，但不因为 secondary category 在多个三级分类重复展示同一篇文章。
- arXiv adapter 需要解析 Atom feed 中的 title、summary、authors、published/submitted 时间、primary category、全部 category、abs 链接和 pdf 链接，并生成站内可阅读内容。
- arXiv ListItem 需要展示来源 category 标签和语义标签，例如 `arXiv`、`cs.CL`、`LLM`、`Agent`、`NLP`、`Vision`、`Robotics`、`Multi-modal` 等；语义标签由标题、摘要和类别文本保守推断。
- Hugging Face、arXiv 和 OpenReview 论文源必须复用现有手动刷新、早上 7:00 基准刷新、每 30 分钟自动刷新和新增标记逻辑。
- 论文条目使用普通文章列表排版，点击后进入站内阅读页，右侧 Codex 对话可基于论文摘要和元信息讨论。
- 论文源标题、摘要、站内正文和 Codex 回复需要支持 Markdown 与 LaTeX 渲染；数据库保留原始文本，前端统一用 Markdown/KaTeX 展示，避免 `E$^2$`、`$\alpha$` 等原始符号直接暴露给用户。标题和卡片内联文本还需要兼容论文标题中常见的裸上标写法，例如 `GD^2PO` 应展示为 `GD²PO`。

### Mathematics

- Mathematics 是左侧一级导航，用于归档与计算机机器学习、最优化理论、统计理论、概率统计、数值分析和应用数学相关的权威期刊、会议和平台。
- 第一版 Mathematics 不纳入 arXiv、MathSciNet、zbMATH，也不新增只提供机构介绍但缺少稳定文章列表的空栏目；优先接入当前可公开抓取的权威来源。
- Mathematics / Optimization 放优化理论、数学规划、运筹优化相关来源：
  - Optimization Online：优化领域重要预印本平台，使用专用 `optimization-online` adapter 抓取 Recent Eprints。
  - Mathematical Programming：MOS 关联核心期刊，使用通用 `academic-toc` adapter 抓取 Springer online-first/issue 文章目录。
  - SIAM Optimization：SIAM Journal on Optimization，使用 `academic-toc` adapter 抓取当前目录。
  - INFORMS MOR：Mathematics of Operations Research，使用 `academic-toc` adapter 抓取当前目录。
- Mathematics / Learning Theory 放学习理论和数学机器学习相关来源：
  - JMLR：机器学习理论与算法权威期刊，使用专用 `jmlr-papers` adapter 抓取当前卷论文。
  - COLT：学习理论核心会议，通过 PMLR proceedings 页面接入。
  - ALT：Algorithmic Learning Theory，通过 PMLR proceedings 页面接入。
- Mathematics / Statistics 放统计理论、概率统计和不确定性建模相关来源：
  - AISTATS：Artificial Intelligence and Statistics，通过 PMLR proceedings 页面接入。
  - UAI：Uncertainty in Artificial Intelligence，通过 PMLR proceedings 页面接入。
  - Statistics and Computing：统计计算方向期刊，使用 `academic-toc` adapter 抓取 Springer issue 文章目录。
- Mathematics / Applied Math 放应用数学、数值分析、科学计算和数学数据科学相关来源：
  - SIAM 作为三级导航，下面按期刊作为四级导航：
    - SISC：SIAM Journal on Scientific Computing。
    - SINUM：SIAM Journal on Numerical Analysis。
    - MDS：SIAM Journal on Mathematics of Data Science。
- 点击 Mathematics 一级导航时，中间内容区使用 coverflow 聚合预览，展示所有最底层 Mathematics 来源中各自排序后的前 2 篇。
- 点击 Mathematics 下的二级导航时，中间内容区使用 coverflow 聚合预览，展示该二级分类下所有最底层来源中各自排序后的前 3 篇。
- 点击 Mathematics 的具体三级来源时，使用普通 ListView 展示该来源文章，并在 ListItem 上展示来源标签和领域标签，例如 `JMLR`、`PMLR`、`COLT`、`AISTATS`、`SIAM`、`Optimization`、`Learning Theory`、`Statistics`、`Applied Math`。
- Mathematics 来源复用现有 source、RawItem、fetch pipeline、manual refresh、早上 7:00 基准刷新、每 30 分钟自动刷新、新增标记、站内阅读和右侧 Codex 对话逻辑。
- Springer、SIAM、INFORMS 等出版商页面可能只公开元信息、摘要和原文链接，完整正文可能受出版商权限限制；站内阅读页应展示已抓取到的元信息/摘要，并保留“打开原文”。

## 5. Plaza需求

Plaza是左侧第一个一级导航。

数据规则：

- 从各最底层内容栏目中各选最新一篇。
- 排除 Github Hot。
- 当前来源分组包括 OpenAI、Anthropic、Qwen / Blog、Qwen / Research、Kimi、MiniMax、ZhipuAI、HuggingFace / Daily Papers、HuggingFace / Trending Papers、OpenReview 各顶会源、Stanford AI Lab、BAIR、CMU ML、Mila、Vector Institute、Mathematics 各最底层期刊/会议/平台来源、Codex / Blog、Codex / Changelog、Claude Code。
- Plaza 暂不纳入 arXiv 各分类论文，避免 Plaza 首屏被 arXiv 高频论文源占满；arXiv 先只在 Papers / arXiv 下展示。
- Mathematics 各最底层来源需要按 Plaza 既有规则纳入 Plaza：每个数学叶子来源各选最新一篇，与其他来源共同按时间倒序进入 coverflow。

视觉和交互：

- 不展示顶部标题说明文案。
- 使用白色背景。
- 使用 coverflow 环形卡片动效。
- 卡片围成视觉上的环，正视图是横向长方形排列。
- 中间卡片突出，两侧卡片按深度后退。
- 动画应持续转动，鼠标 hover 不应暂停。
- 除非用户点击卡片进入对应站内文章，否则动画继续。
- 控制按钮为“上一张 / 下一张”。
- 卡片区域和按钮整体需要水平、垂直居中。
- 按钮下方不应出现大片无意义留白。
- 卡片内容不能被明显遮挡，必要时可以适当放大卡片或减少卡片内文本密度。
- 卡片标题最多展示两行时，必须给标题行高和底部留出足够缓冲，避免粗体英文、论文标题或 3D 缩放状态下文字底部被裁切。
- 普通文章列表和 Plaza 卡片标题下方的副文案不能重复展示同一个标题；前端应优先展示非重复的 `summary`，其次展示非重复的 `excerpt`，如果两者都与标题重复或为空，则直接隐藏副文案区域。
- 日期为今天的文章或博客需要在 Plaza / 父级导航 coverflow 卡片和普通 ListView 列表项上显示 `今日` 胶囊标记；标记采用 meta 行内 A 方案，占用正常布局空间，不能绝对定位覆盖标题、来源、日期、摘要或操作按钮，也不能继承来源文本的截断样式导致徽标自身显示异常。
- Plaza交互最终选用 `C：惯性回弹` 方案。
- 卡片区域支持触摸板左右滑动和按住左右拖动，滑动后保留轻微惯性并回弹贴近最近主卡。
- 用户不手动滑动时，Plaza必须保持自动、匀速、缓慢向右滑动；自动速度需要偏慢，约 1 分钟完成一圈，避免浏览时产生压迫感。
- 鼠标 hover 不暂停自动转动；只有用户主动滑动、拖动、点击时才改变当前相位或进入文章。

## 6. 文章阅读与 Codex 交互

- 点击任意文章或博客卡片后进入站内阅读页。
- 普通列表、Plaza 卡片和 Github Hot 卡片中的标题、摘要/说明文字都属于卡片点击区域；点击这些文字应进入站内阅读页。只有“原文”“仓库”“收藏”“标记已读”等显式操作控件例外，继续执行各自操作。
- 站内阅读页应展示文章正文；只有在确实无法抓取全文时才提示“未获取到完整正文”。
- 站内阅读页应尽量保留原文正文中的图片、图注、标题层级、列表、引用、代码块、表格和正文链接；图片和链接需要转换成绝对 URL 后展示。
- 站内阅读页的富 HTML 正文也需要渲染文本节点中的 LaTeX 公式，至少覆盖 `\(...\)`、`\[...\]` 和 `$$...$$`，并避免处理代码块中的同类文本。
- 不要求也不应该完整复刻原站页面；抓取时需要去掉导航、页脚、脚本、表单、iframe、埋点和其他页面 chrome，只保留安全正文结构。
- 富正文存储在现有 `item_content.content` 中，并使用内部格式标记；用于 Codex 对话、摘要判断和正文长度判断时必须转换回纯文本，不能把 HTML 标签直接喂给 Codex。
- 已抽取并存储为富 HTML 的正文，只要达到正文最小展示长度，就应在站内阅读页展示；不能因为论文作者列表、来源信息等 metadata excerpt 比正文更长而误判为“未获取到完整正文”或反复触发详情页重抓。Vector Institute 是例外：它只展示列表页元信息，不展示或补抓外部论文页正文。
- 站内阅读页中间文章内容区需要保证正文阅读宽度，但不能挤压右侧 Codex 对话框；桌面端应给右侧聊天保留足够横向空间。
- 提供“打开原文”选项，跳转原始链接；该选项应放在拓宽后的文章内容区右上方。
- 选中文章后，右侧出现 Codex 文章助手。
- 右侧助手只展示聊天对话框和输入区，不展示文章标题、摘要、为什么重要、建议动作等静态信息。
- 桌面端右侧聊天框需要自适应占满页面可用垂直长度，消息区在中间滚动，输入框固定在聊天框底部。
- 右侧助手输入区使用多行 `textarea`，支持输入长问题或多行提示词；`Enter` 直接发送，`Shift+Enter` 保留为换行。
- Codex 回复按 Markdown 渲染，至少支持段落、列表、链接、引用、代码块和表格。
- 当前本机 `codex exec --json` 已确认可输出事件流，但未确认稳定 token 级正文增量；在没有稳定增量文本事件前，聊天先保持一次性返回。
- 每篇文章或博客与 Codex 的对话记录需要永久保留。
- 对话记录按 `source_id + canonical_url + mode` 绑定，不按易被刷新重建的 `item_id` 绑定。
- 刷新重拉取或 source 裁剪旧 item 时，不得删除同一原文 URL 对应的 Codex 对话历史。
- 用户重新打开同一篇文章或博客时，右侧聊天框需要自动恢复历史消息。
- 右侧 Codex 对话必须按多轮形式工作；每次提问都需要把当前文章或博客的历史对话一并传给服务端 Codex worker，使后续问题可以基于前文回答。
- 用户不会另接外部模型 API 做文章助手；第一版只调用本地 Codex 交互。
- 浏览器不能直接调用模型；需要通过服务端路由调用本地 Codex。
- 服务端调用本地 Codex 时保持当前本机模型和 reasoning effort 配置，不在项目代码中覆盖 `--model` 或 effort；默认命令继续使用 `codex exec --sandbox read-only --skip-git-repo-check -`。
- 右侧助手的快捷选项不常驻显示；用户在输入框中输入 `@` 后，输入框上方显示快捷选项列表，点击某项后立即按对应提示词向 Codex 发送。
- 快捷选项固定为：
  - 提炼核心：`用中文帮忙总结提炼一下本文的核心内容；`
  - 梳理介绍：`用中文帮忙梳理介绍一下这篇文章的内容；`
  - 翻译中文：`将这篇英文文章翻译为中文，注意专业术语的翻译需贴合文章领域与表达；`
  - 摘要总结：`用中文翻译并总结一下该文章的摘要`
  - 我的收获：`用中文帮忙整理一下这篇文档对于我这样的AI从业者(程序员)，有什么启发，有什么值得学习的地方，向我清晰罗列并说明理由；`
- 右侧助手还需要支持 `/` 触发的 Slash 快捷命令。当前固定提供 `/web-search ` 联网搜索命令；用户可继续在命令后输入提示词，例如 `/web-search 打开原网址阅读原论文，然后回答问题`。
- `/web-search <prompt>` 发送后，服务端需要先尝试抓取当前文章原网址正文和少量相关网页搜索结果，再把当前文章、历史对话、联网检索材料与用户提示词一起交给 Codex 回答；如果检索不到可用材料，也必须明确把“未检索到可用联网材料”作为上下文交给 Codex，而不是静默失败。

## 7. 抓取与定时刷新

定时刷新要求：

- 以每天早上 7:00 为基准。
- 7:00 之后每 30 分钟自动更新拉取。
- 支持点击刷新按钮手动拉取。
- 7:00 之后新增的文章或卡片需要标记“新增”。
- 第二天 7:00 后，上一周期新增标记清零，之后新拉取内容重新标记。
- 服务端定时刷新写入数据库后，前端当前页面需要自动同步最新列表数据，确保Plaza和父级导航 coverflow 动图会随新增文章或博客更新，不需要用户手动刷新页面。

当前实现要点：

- 默认基准时间：`BRIEF_FETCH_HOUR=7`，`BRIEF_FETCH_MINUTE=0`。
- 默认刷新间隔：`BRIEF_FETCH_INTERVAL_MINUTES=30`。
- 本地嵌入式 scheduler 可通过 `BRIEF_DISABLE_EMBEDDED_SCHEDULER=1` 关闭。
- 手动刷新、脚本刷新和定时刷新共用同一条 fetch pipeline。
- 前端 Dashboard 默认每 60 秒静默同步一次当前视图；页面不可见或用户已打开文章详情时暂停同步，避免打断站内阅读和右侧 Codex 对话。
- 新增 source 只要在 `sources` 中启用，就必须自动进入同一条刷新 pipeline；Hugging Face Papers 不单独实现另一套定时逻辑。
- source 级网络抓取默认受限并发执行，默认并发数：`BRIEF_SOURCE_FETCH_CONCURRENCY=4`。
- 文章正文补全文默认受限并发执行，默认并发数：`BRIEF_CONTENT_FETCH_CONCURRENCY=4`。
- 并发只用于网络抓取；SQLite 落库、过期项清理和 `fetch_runs` 记录必须串行执行，避免为了提速破坏去重、fetch_runs、新增标记逻辑，或触发 SQLite `database is locked`。

## 8. 数据与扩展性

数据层第一版使用 SQLite。

核心关注对象：

- sources
- items
- item_content
- summaries
- read_state
- assistant_threads
- article_assistant_threads
- fetch_runs

扩展规则：

- 新增普通 RSS 博客时，应优先只新增 source 配置。
- 新增无 RSS 的 AI 公司页面时，应新增 adapter，不改前端核心模型。
- 新增无 RSS 的论文/榜单页面时，应优先新增 source adapter，并复用 `RawItem`、`items`、`item_content`、`fetch_runs`。
- 数学期刊、会议和平台来源应优先复用 `optimization-online`、`jmlr-papers`、`pmlr-proceedings`、`academic-toc` 这类 source adapter；只有目标页面结构无法由现有 adapter 稳定表达时才新增专用 adapter。
- X 名人、YouTube 等作为后续阶段，接入前需要评估登录、限流、稳定性和合规成本；arXiv 已在 Papers 下通过官方 Atom API 接入。

## 9. 排序、分页与过滤

- 普通文章列表每页固定展示 10 篇，超出后分页。
- Papers 普通论文列表每页固定展示 10 篇，超出后分页。
- ListView 右下角分页区需要支持输入指定页码并直接跳转，输入页码应限制在有效页码范围内。
- Header 最上方提供窄型信息提醒 TopBar；每个工作日下午 `14:45-15:00` 按上海本地时间显示红色滚动文字 `Pay attention to the timing of fund transactions`，位于原 Header 主体上方，其他时间不渲染且不占位。
- TopBar 右侧提供全库标题搜索；用户输入关键词后，搜索框下方只展示当前项目库中标题命中关键词的文章或代码库标题名，不展示摘要、来源、标签等辅助信息；关键词匹配不区分大小写，但结果排序需要优先展示大小写最贴近用户输入的标题：完全同大小写匹配优先，其次从关键词第一个字符开始逐位比较大小写匹配程度，例如输入 `GE` 时排序应优先 `GE`，再到 `Ge`、`gE`、`ge`；搜索结果每页固定展示 10 条，支持上一页/下一页分页；鼠标或触控按下任一结果标题时必须立即打开对应文章或代码库的 DetailView，键盘聚焦结果项后按 Enter/Space 也必须进入 DetailView；搜索输入框与其 Suggestions Dropdown 必须等宽，视觉上作为一个完整 Combobox 呈现。
- 每个逐层导航栏目中的文章先按优先级排序，再在同优先级内按时间排序，最新在前。
- 如果源文章或博客只提供发布日期、没有具体时分，站内展示时只显示带年份日期，例如 `2026/06/09`，不允许 mock 成 `00:00`、`08:00` 等假时分；排序仍按发布日期前后处理。
- 如果源明确提供具体发布时间，例如 ISO datetime 或含小时分钟的时间戳，站内可以展示带年份时分，例如 `2026/06/16 10:00`。
- Hugging Face Papers 在同时存在 `submit` 和 `publish` 时展示两个日期：`submit` 来自 HF Daily 列表日期或详情页 `submittedOnDailyAt`，`publish` 来自论文详情页 `publishedAt`；如果其中一个时间未知，则隐藏未知项，例如只展示 `publish 2026/12/28 20:54`，不展示 `submit 未知`。全站文章排序时间优先使用 `submit`，其次使用 `publish`，最后使用入库创建时间；Daily Papers 和 Trending Papers 都按该时间倒序展示。
- Github Hot每页展示 8 个项目。
- 顶部保留放大的 AICron Info Radar 标识，左边缘与左侧导航内容区对齐；TopBar 右侧展示克制的标题搜索框。关闭 Next.js 开发模式自带 Dev Indicator，页面左下角只保留项目内矩形 `N` 快捷入口，入口整体为低调浅色长方形，宽度铺满左侧栏，左侧保留更小的 `N` 圆标，不展示“快捷/操作”等文字；点击入口后展示与入口同宽且左边缘对齐的白底圆角列表面板，顶部为 AICron/N 身份行，下方以行式菜单列出“刷新”和“只看未读”两个选项。

## 10. 后续变更同步要求

从 2026-06-18 起，后续对产品需求、导航结构、信息源范围、抓取规则、展示规则、交互规则、定时刷新逻辑的改动，都需要同步更新本文档。

执行规则：

- 改 UI 行为时，更新“导航结构”“Plaza需求”“文章阅读与 Codex 交互”等相关章节。
- 改 source 或 adapter 时，更新“内容源规则”和“数据与扩展性”。
- 改 scheduler 或新增标记逻辑时，更新“抓取与定时刷新”。
- 改分页、排序、过滤时，更新“排序、分页与过滤”。
- 如果实现和文档冲突，以用户最新明确需求为准，并在同次改动中修正文档。

## 10.1 Codex 任务完成提醒

- 仅当前项目启用，不写入全局 Codex 配置或其他项目。
- 每次 Codex 完成用户交给当前项目的全部任务，并准备发送最终回复前，运行 `npm run notify:done`。
- `notify:done` 需要快速返回，并在后台延迟播报，保证最终文字尽量先出现在 Codex App 里，语音再响起。
- 默认延迟：`CODEX_DONE_NOTIFY_DELAY_MS=3000`。
- 默认通过 macOS 自带 `/usr/bin/say` 播报：`Codex任务完成`。
- 延迟播报应使用后台 shell 进程执行，避免 Codex 工具进程结束后清理 Node 计时器导致语音不响。
- 可通过 `CODEX_DONE_MESSAGE` 临时覆盖播报文本。
- 如果用户明确要求不要提醒，或当前环境无法运行该命令，本次可跳过，并在最终回复里说明。

## 10.2 本地启动边界

- 当前项目只能本地启动，不允许暴露到 `10.156.132.38` 或任何局域网/公网网卡。
- 当前目录 `/Users/gj/Documents/vsfile/aicron` 是 `main` 稳定展示工作区，固定用于本地 `3000` 端口；启动命令为 `npm run dev` 或 `npm run dev:main`。
- `dev` 发展分支使用独立 worktree：`/Users/gj/Documents/vsfile/aicron/.worktrees/dev`，固定用于本地 `3001` 端口；启动命令为 `npm run dev:dev`。
- 启动 Next dev server 时必须显式绑定 `127.0.0.1`；上述命令都通过 `scripts/start-localhost.mjs` 创建本地-only server。
- `npm run dev:next` 仅保留为原始 Next CLI 备用命令，不用于日常启动，因为当前环境中 Next CLI 即使传 `--hostname` 也可能监听到 `*:3000`。
- 启动后需要验证监听地址是 `127.0.0.1:3000`、`127.0.0.1:3001` 或等价 localhost 地址，不能是 `*:3000`、`*:3001`、`0.0.0.0:*`、`[::]:*` 或局域网 IP。

## 10.3 原型与候选方案

- 每日油价属于附带信息，不进入主文章流，也不新增为与 AI 内容同级的一级导航。
- `/oil-price-prototypes` 保留为油价低干扰展示方案的原型对比页；主界面采用候选 A 的多行上下滚动形式。
- 油价展示原则：默认城市为上海；位置固定在左侧栏下方、左下角 `N` 快捷按钮上方；只展示 `92#`、`95#`、`98#` 三类汽油价格；涨跌值表示相对于上一期的调整，上升用向上箭头和克制红色，下降用向下箭头和克制绿色，不直接展示 `+/-`；右上角日期必须完整显示；使用小字号、低对比度、弱动效；不使用强提醒色；候选 A 方案采用多行上下滚动，不使用单行左右跑马灯；主页面内容持续缓慢上下滚动，鼠标或触摸板悬停在消息框上时可通过上下滚动手势控制滚动方向，并支持 `prefers-reduced-motion` 静止。
- 正式实现使用 `/api/oil-price` 单独拉取上海油价，不写入文章数据库，不参与 Plaza、Developers、Coder、Papers、Labs 或 Github Hot 的列表排序。
- 油价来源优先使用汽油价格网公开页面：上海价格页 `http://www.qiyoujiage.com/shanghai.shtml` 提供 92/95/98 当前价格，`/92.shtml`、`/95.shtml`、`/98.shtml` 提供相对上一期调价描述；如果源站没有明确涨跌值，不允许 mock，前端显示 `--`。
- 油价 API 使用“下一次本地早上 7 点”作为内存缓存过期时间；主页面加载时读取一次，页面打开期间不参与 AI 内容的 30 分钟自动刷新；点击左下角“刷新”时仍可强制刷新油价。

## 11. 回归保护要求

后续改动不能破坏已经实现并确认过的功能。每次改动前需要先判断影响范围，改动后至少做对应的最小回归检查。

关联面扫描要求：

- 任意改动前，都必须先查看整个项目中与改动对象关联的代码、配置、测试和文档。
- 需要明确列出或在实现中体现这些关联点：数据源配置、adapter、fetcher 分发、数据库查询、API 路由、前端导航/筛选/展示、分页排序、定时刷新、测试、项目需求文档。
- 如果某处与改动有关联，要判断它是直接依赖、间接依赖、同类模式复用，还是回归保护对象。
- 调整策略必须遵循“最小、最优、可扩展”：优先复用现有 Source Adapter、RawItem、fetch pipeline、API 查询和 UI 状态模型；只在现有抽象无法表达时新增 adapter 或小型抽象。
- 新增来源或展示类型时，不允许只改前端或只改后端；必须同步检查 source 配置、抓取逻辑、过滤排序、导航映射、Plaza聚合、测试和本文档。
- 如果发现关联面较大，先收敛为最小垂直切片，避免顺手重构无关模块。

必须重点保护的既有功能：

- 左侧导航结构：
  - 没有子导航的一级导航不可折叠。
  - 点击有子导航的一级导航时，只展示下一层导航标题，不自动展开全部后代；二级和三级内容必须由用户逐层点击后才展示。
  - 左侧导航层级展开较多时，只有导航区本身上下滚动；滚动区域下界必须与底部固定的油价消息框上界相接，不能延伸到 Oil Widget 或 `N` 快捷入口背后，不能出现下方导航被遮挡后无法点击的情况。
  - Developers下的T1、T2是可折叠二级导航。
  - Qwen 在T2下继续保留 Blog / Research 三级导航。
  - Coder 下 Codex 继续保留 Blog / Changelog，Claude Code 保持独立入口。
- 厂商筛选：
  - 点击 Anthropic、OpenAI、Qwen、Kimi、MiniMax、ZhipuAI 时，列表必须显示对应来源内容，不能回落到Plaza混合内容。
  - 厂商页请求必须带明确 view，不能被后端默认 plaza 逻辑覆盖。
- Plaza：
  - 不展示顶部说明文案。
  - coverflow 卡片持续转动，鼠标 hover 不暂停。
  - coverflow 卡片标题必须完整显示，不能使用行数截断，并保持接近原始卡片标题的视觉权重；摘要、介绍、来源、作者或日期等辅助信息可以按空间截断。
  - 日期为今天的文章或博客在 coverflow 卡片顶部 meta 行显示 `今日` 胶囊；胶囊必须使用正常 inline 布局，不得遮挡已有文字，也不得被来源文本的省略号规则截断。
  - 点击卡片或卡片标题进入站内文章；该点击路径必须兼容 coverflow 拖拽的 pointer capture，不能因为拖拽捕获导致普通点击失效。
  - 卡片区域与控制按钮保持居中，按钮下方不能出现大面积无意义留白。
- ListView：
  - 日期为今天的文章或博客在 ListItem meta 行日期后显示 `今日` 胶囊；胶囊可自然换行，但不得覆盖 vendor、source、date、标题、摘要或操作按钮。
- Github Hot：
  - 每页 8 个项目。
  - 使用项目卡片排版，不回退成普通文章列表。
  - 分页选择必须保持在屏幕中可见。
- 文章阅读：
  - 点击文章进入站内阅读页。
  - 在列表卡片、Plaza 卡片和 Github Hot 项目卡片中，点击标题或标题下方摘要/说明文本也必须进入站内阅读页；这些文本区域 hover 时显示可点击状态，click/pointer/键盘确认路径都不能被 Markdown 链接或卡片拖拽逻辑吞掉。
  - 可打开原文。
  - 能展示正文中的安全图片和主要正文结构，不退回成纯文本堆叠。
  - 选中文章后右侧出现 Codex 文章助手。
- 定时刷新：
  - 早上 7:00 为基准。
  - 之后每 30 分钟拉取。
  - 新增内容标记逻辑不能被 UI 改动破坏。

最小回归检查：

- 代码改动后必须跑 `npm run typecheck`。
- 改导航或筛选时，检查对应 URL 参数和后端过滤逻辑。
- 改Plaza或 Github Hot UI 时，检查分页、点击、原文链接、收藏按钮仍可用。
- 改 source 或抓取逻辑时，检查现有来源不会被错误混入或隐藏。
