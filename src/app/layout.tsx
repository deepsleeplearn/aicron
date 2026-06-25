import type { Metadata } from "next";

import "katex/dist/katex.min.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "AICron",
  description: "AI Information Cron - a local-first AI technical update workspace."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
