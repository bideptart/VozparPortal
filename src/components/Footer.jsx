import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="border-t border-[var(--border)] bg-gradient-to-b from-[var(--card)] to-[var(--background)] backdrop-blur">
      <div className="px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="text-[var(--body)] tracking-wide">
          © {year} <strong className="text-[var(--foreground)]">vozper.com</strong>
          <span className="mx-2 text-[var(--border)]">·</span>
          powered by{' '}
          <a
            href="https://www.rozper.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-[var(--primary)] hover:text-[var(--primary-hover)] underline decoration-[var(--primary)] underline-offset-2 transition-colors"
          >
            Rozper
          </a>
        </div>
        <nav className="flex items-center gap-4 sm:gap-5">
          <Link to="/terms" className="text-[var(--body)] hover:text-[var(--primary)] underline-offset-4 hover:underline decoration-[var(--primary)] transition-all hover:-translate-y-px">
            Terms &amp; Conditions
          </Link>
          <span className="text-[var(--border)]">•</span>
          <Link to="/privacy" className="text-[var(--body)] hover:text-[var(--primary)] underline-offset-4 hover:underline decoration-[var(--primary)] transition-all hover:-translate-y-px">
            Privacy Policy
          </Link>
          <span className="text-[var(--border)]">•</span>
          <a
            href="mailto:support@vozper.com"
            className="text-[var(--body)] hover:text-[var(--primary)] underline-offset-4 hover:underline decoration-[var(--primary)] transition-all hover:-translate-y-px"
          >
            Support
          </a>
        </nav>
      </div>
    </footer>
  );
}