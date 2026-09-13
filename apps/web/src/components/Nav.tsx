import { Moon, Sun } from "lucide-react";
import Logo from "./Logo";
import { useTheme } from "../lib/theme";
import { href, type Route } from "../lib/router";

/**
 * Comparison is deliberately absent. It is not a place you go, it is something you do to agents you
 * picked in the marketplace, and a navbar entry that lands on an empty table taught the wrong thing.
 * The marketplace carries the entry point instead.
 */
const LINKS: { to: string; label: string; name: Route["name"] }[] = [
  { to: href.home, label: "Overview", name: "home" },
  { to: href.agents, label: "Marketplace", name: "agents" },
  { to: href.how, label: "How it works", name: "how" },
  { to: href.dev, label: "Developers", name: "dev" },
  { to: href.faq, label: "FAQ", name: "faq" },
];

export default function Nav({ route, block }: { route: Route; block?: number }) {
  const { theme, toggle } = useTheme();
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <header className="nav">
      <div className="shell nav-inner">
        <a className="nav-brand" href={href.home} aria-label="Tinjau home">
          <Logo />
        </a>

        <nav className="nav-links" aria-label="Sections">
          {LINKS.map((l) => (
            <a key={l.to} href={l.to} className={`nav-link${route.name === l.name ? " is-active" : ""}`}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav-side">
          <span className="nav-live mono num" title="Read live from Creditcoin CC3 testnet">
            {block ? `block ${block.toLocaleString("en-US")}` : "connecting"}
          </span>
          <button
            type="button"
            className="icon-btn"
            onClick={toggle}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>
      <nav className="nav-links-mobile" aria-label="Sections">
        {LINKS.map((l) => (
          <a key={l.to} href={l.to} className={`nav-link${route.name === l.name ? " is-active" : ""}`}>
            {l.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
