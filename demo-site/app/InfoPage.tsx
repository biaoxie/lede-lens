import type { ReactNode } from "react";

type InfoPageProps = {
  eyebrow: string;
  title: string;
  introduction: string;
  children: ReactNode;
};

export default function InfoPage({
  eyebrow,
  title,
  introduction,
  children,
}: InfoPageProps) {
  return (
    <main className="info-shell">
      <header className="info-header">
        <a className="demo-brand" href="/" aria-label="LedeLens home">
          <span className="lens-mark"><i /><i /></span>
          <span><strong>LedeLens</strong><small>Article structure analysis</small></span>
        </a>
        <nav aria-label="LedeLens pages">
          <a href="/features">Features</a>
          <a href="/how-it-works">How it works</a>
          <a href="/install">Install</a>
          <a href="/privacy">Privacy</a>
        </nav>
      </header>

      <article className="info-content">
        <p className="intro-kicker">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="info-introduction">{introduction}</p>
        {children}
      </article>

      <footer className="info-footer">
        <p><strong>LedeLens</strong> helps readers inspect reasoning without deciding what to believe.</p>
        <div>
          <a href="/">Try the interactive demo</a>
          <a href="https://github.com/biaoxie/lede-lens" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
        </div>
      </footer>
    </main>
  );
}
