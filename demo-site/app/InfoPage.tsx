import type { ReactNode } from "react";
import Link from "next/link";

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
        <Link className="demo-brand" href="/" aria-label="LedeLens home">
          <span className="lens-mark"><i /><i /></span>
          <span><strong>LedeLens</strong><small>Article structure analysis</small></span>
        </Link>
        <nav aria-label="LedeLens pages">
          <Link href="/features">Features</Link>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/guides/evaluate-evidence-in-a-news-article">Guide</Link>
          <Link href="/install">Install</Link>
          <Link href="/privacy">Privacy</Link>
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
          <Link href="/">Try the interactive demo</Link>
          <Link href="/guides/evaluate-evidence-in-a-news-article">Read the evidence guide</Link>
          <a href="https://github.com/biaoxie/lede-lens" target="_blank" rel="noreferrer">View source on GitHub ↗</a>
        </div>
      </footer>
    </main>
  );
}
