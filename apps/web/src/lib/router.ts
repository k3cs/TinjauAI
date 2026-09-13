import { useEffect, useState } from "react";

/**
 * Hash routes, so the static build works on any host without rewrite rules:
 *   #/            landing
 *   #/marketplace the marketplace table (#/agents still works)
 *   #/how         how it works and who it is for
 *   #/faq         questions judges and visitors ask
 *   #/developers  MCP server, contracts, read API, running a scout
 *   #/bounties    the marketplace, on its bounties tab
 *   #/compare     two to four agents side by side (?ids=22771,50283); reached from the marketplace,
 *                 not from the navbar, because it is something you do to agents you picked
 */
export type MarketTab = "agents" | "bounties";

export type Route =
  | { name: "home" }
  /** The marketplace, on one of its two tabs. */
  | { name: "agents"; tab: MarketTab }
  | { name: "how" }
  | { name: "faq" }
  | { name: "dev" }
  /** Two to four agents, in the order the visitor picked them. */
  | { name: "compare"; ids: string[] };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, "") || "/";
  const [path, query = ""] = h.split("?");
  const q = new URLSearchParams(query);
  if (path.startsWith("/agents") || path.startsWith("/marketplace")) return { name: "agents", tab: "agents" };
  // Bounties are a tab of the marketplace, and keep their own address so the tab can be linked to.
  if (path.startsWith("/bounties")) return { name: "agents", tab: "bounties" };
  if (path.startsWith("/how")) return { name: "how" };
  if (path.startsWith("/faq")) return { name: "faq" };
  if (path.startsWith("/developers")) return { name: "dev" };
  if (path.startsWith("/compare")) {
    // ?ids=1,2,3 is the shape now; ?a=&b= is kept so older links still open.
    const ids = (q.get("ids") ?? [q.get("a"), q.get("b")].filter(Boolean).join(","))
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    return { name: "compare", ids };
  }
  return { name: "home" };
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0, behavior: "auto" });
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

export const href = {
  home: "#/",
  agents: "#/marketplace",
  how: "#/how",
  faq: "#/faq",
  dev: "#/developers",
  bounties: "#/bounties",
  compare: (ids?: (bigint | string)[] | bigint | string, second?: bigint | string) => {
    const list = Array.isArray(ids) ? ids : [ids, second].filter((v) => v !== undefined && v !== null);
    return list.length ? `#/compare?ids=${list.join(",")}` : "#/compare";
  },
};

export function navigate(to: string) {
  window.location.hash = to.replace(/^#/, "");
}
