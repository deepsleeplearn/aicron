const LOGO_VARIANTS = [
  {
    id: "A",
    name: "Cron Pulse",
    note: "定时抓取、每日节律、信息脉冲，适合突出 Cron 属性。",
    className: "cronPulse",
  },
  {
    id: "B",
    name: "Signal Stack",
    note: "多源聚合、技术信息流、扫描感，适合强调信息工作台。",
    className: "signalStack",
  },
  {
    id: "C",
    name: "AIC Monogram",
    note: "更产品化的字母组合，适合后续做独立应用图标。",
    className: "aicMono",
  },
  {
    id: "D",
    name: "Info Radar",
    note: "监测 AI 信息、论文和动态，偏技术情报台气质。",
    className: "infoRadar",
  },
  {
    id: "E",
    name: "Plain Wordmark",
    note: "克制文字标，和当前白底高密度工作台最贴合。",
    className: "plainWord",
  },
];

type LogoVariant = (typeof LOGO_VARIANTS)[number];

function LogoMark({ variant, compact = false }: { variant: LogoVariant; compact?: boolean }) {
  return (
    <div className={`brandLockup ${variant.className} ${compact ? "compact" : ""}`}>
      <span className="brandSymbol" aria-hidden="true" />
      <span className="brandWord">AICron</span>
    </div>
  );
}

export default function LogoPrototypePage() {
  return (
    <main className="logoPrototypePage">
      <header className="logoPrototypeHeader">
        <div>
          <p>Brand Prototype</p>
          <h1>AICron Logo</h1>
        </div>
        <span>D selected for the main workspace</span>
      </header>

      <section className="logoPreviewBoard">
        {LOGO_VARIANTS.map((variant) => (
          <article className="logoOption" key={variant.id}>
            <div className="logoOptionTop">
              <span>{variant.id}</span>
              <div>
                <h2>{variant.name}</h2>
                <p>{variant.note}</p>
              </div>
            </div>

            <div className="logoCanvas">
              <LogoMark variant={variant} />
            </div>

            <div className="logoHeaderMock">
              <LogoMark variant={variant} compact />
              <nav aria-label={`${variant.name} navigation preview`}>
                <span>Plaza</span>
                <span>Developers</span>
                <span>Papers</span>
              </nav>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
