/**
 * The agent's own words.
 *
 * ERC-8004 agents are ERC-721 tokens whose `tokenURI` points at a registration document: name,
 * description, what the agent does, where to call it. That document is written by the agent's owner
 * and nobody checks it, which is exactly why Tinjau shows it in its own compartment, labelled, next
 * to the facts the contract could prove. A marketplace needs both: you cannot shop without knowing
 * what an agent claims to do, and you should not pay without knowing what was proven.
 *
 * Read straight from Ethereum in the browser (the public RPC answers browser origins). A sizeable
 * minority of owners publish their document on a host that refuses cross-origin requests, and the
 * browser simply cannot read those; when a Tinjau read API is configured, the page asks it to fetch
 * the same document verbatim and parses it here all the same. A card that cannot be fetched either
 * way is reported as missing, never invented.
 */

const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const TOKEN_URI = "0xc87b56dd"; // tokenURI(uint256)

const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"];

export interface AgentCard {
  agentId: bigint;
  /** Where the document came from, so a reader can open it. */
  uri?: string;
  name?: string;
  description?: string;
  image?: string;
  /** Category and tag words the owner wrote, deduplicated. */
  tags: string[];
  /** Named skills, if the document lists any. */
  skills: string[];
  /** Interfaces it says it speaks: A2A, MCP, API, x402… */
  interfaces: string[];
  /** A page a human can open, when the document names one. */
  homepage?: string;
  /** Where a price list would be, when the document names one. */
  catalog?: string;
  x402: boolean;
  /** Present only when the document says so; `undefined` means it did not say. */
  active?: boolean;
  /** Set when the document could not be read at all. */
  unavailable?: string;
}

/**
 * The Tinjau read API, when this build was given one. It is only ever used as a fallback for a
 * document the browser is not allowed to fetch, and it returns that document untouched; no fact on
 * this page comes from it.
 */
const env = (import.meta as { env?: Record<string, string> }).env ?? {};
const API_BASE = (env.VITE_TINJAU_API ?? (env.DEV ? "http://localhost:8787" : "")).replace(/\/$/, "");

interface ProxiedCard {
  uri?: string;
  doc: Record<string, unknown> | null;
  /** Why the API could not read it either, so the card can name the real cause rather than assume one. */
  reason?: "none" | "not-a-document" | "unreachable";
}

async function fetchViaApi(agentId: bigint): Promise<ProxiedCard | undefined> {
  if (!API_BASE) return undefined;
  try {
    const res = await fetch(`${API_BASE}/card/${agentId}`, { signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return undefined;
    return (await res.json()) as ProxiedCard;
  } catch {
    return undefined; // no API running, or it could not reach the host either
  }
}

const cache = new Map<string, Promise<AgentCard>>();

function hexToString(hex: string): string | undefined {
  if (!hex || hex === "0x") return undefined;
  const b = hex.slice(2);
  const offset = parseInt(b.slice(0, 64), 16) * 2;
  const length = parseInt(b.slice(offset, offset + 64), 16) * 2;
  const body = b.slice(offset + 64, offset + 64 + length);
  const bytes = new Uint8Array(body.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(body.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder().decode(bytes);
}

async function readTokenUri(agentId: bigint): Promise<string | undefined> {
  const data = TOKEN_URI + agentId.toString(16).padStart(64, "0");
  const res = await fetch(ETH_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_call", params: [{ to: IDENTITY_REGISTRY, data }, "latest"] }),
  });
  const json = (await res.json()) as { result?: string };
  return json.result ? hexToString(json.result) : undefined;
}

async function fetchJson(url: string, timeout = 6_000): Promise<Record<string, unknown> | undefined> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeout), headers: { accept: "application/json" } });
  if (!res.ok) return undefined;
  const text = (await res.text()).slice(0, 100_000);
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return undefined; // an HTML page where a document was promised is not a document
  }
}

async function fetchDoc(uri: string): Promise<Record<string, unknown> | undefined> {
  if (uri.startsWith("data:")) {
    const [meta, body] = [uri.slice(0, uri.indexOf(",")), uri.slice(uri.indexOf(",") + 1)];
    try {
      const text = meta.includes(";base64") ? atob(body) : decodeURIComponent(body);
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice(7);
    for (const gw of IPFS_GATEWAYS) {
      try {
        const doc = await fetchJson(gw + cid);
        if (doc) return doc;
      } catch {
        /* try the next gateway */
      }
    }
    return undefined;
  }
  if (/^https?:\/\//.test(uri)) {
    try {
      return await fetchJson(uri);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() ? v.trim() : undefined);

function words(...sources: unknown[]): string[] {
  const out: string[] = [];
  for (const s of sources) {
    if (!Array.isArray(s)) continue;
    for (const item of s) {
      const w = typeof item === "string" ? item : str((item as Record<string, unknown>)?.name);
      if (w && !out.some((o) => o.toLowerCase() === w.toLowerCase())) out.push(w);
    }
  }
  return out.slice(0, 8);
}

/** IPFS images have to go through a gateway too, and a broken one must not break the card. */
export function imageUrl(image?: string): string | undefined {
  if (!image) return undefined;
  if (image.startsWith("ipfs://")) return IPFS_GATEWAYS[0] + image.slice(7);
  return /^https?:\/\//.test(image) ? image : undefined;
}

/** One registration document, turned into a card. The only place this translation happens. */
function fromDoc(agentId: bigint, uri: string | undefined, doc: Record<string, unknown>): AgentCard {
  const services = Array.isArray(doc.services) ? (doc.services as Record<string, unknown>[]) : [];
  const named = (n: string) => services.find((s) => str(s.name)?.toLowerCase() === n)?.endpoint;

  return {
    agentId,
    uri,
    name: str(doc.name),
    description: str(doc.description),
    image: str(doc.image),
    tags: words(doc.categories, doc.tags),
    skills: words(doc.skills, doc.capabilities),
    interfaces: words(services.map((s) => str(s.name)).filter(Boolean)),
    homepage: str(doc.url) ?? str(doc.externalLink) ?? str(named("web")) ?? str(named("Web")),
    catalog: str(named("catalog")) ?? str(named("x402")),
    x402: doc.x402Support === true,
    active: typeof doc.active === "boolean" ? doc.active : undefined,
  };
}

export function readAgentCard(agentId: bigint): Promise<AgentCard> {
  const key = agentId.toString();
  const hit = cache.get(key);
  if (hit) return hit;

  const task = (async (): Promise<AgentCard> => {
    const empty: AgentCard = { agentId, tags: [], skills: [], interfaces: [], x402: false };
    let uri: string | undefined;
    try {
      uri = await readTokenUri(agentId);
    } catch {
      const viaApi = await fetchViaApi(agentId);
      if (viaApi?.doc) return fromDoc(agentId, viaApi.uri, viaApi.doc);
      return { ...empty, unavailable: "Ethereum could not be reached for this agent's registration." };
    }
    if (!uri) return { ...empty, unavailable: "This agent has published no registration document." };

    // Both attempts start together. The browser's own read stays the one that counts, so a document
    // this page can fetch is never taken second-hand; but waiting for it to time out before asking
    // the API cost nine seconds per unreachable host, which is most of them. The hedge is a request
    // to our own cache, and the direct answer still wins whenever it arrives.
    const direct = fetchDoc(uri);
    const hedged = uri.startsWith("data:") ? Promise.resolve(undefined) : fetchViaApi(agentId);
    let doc = await direct;
    let viaApi: ProxiedCard | undefined;
    if (!doc) {
      viaApi = await hedged;
      if (viaApi?.doc) doc = viaApi.doc;
    } else {
      void hedged.catch(() => undefined);
    }
    if (!doc) {
      // Say where the registration is and what went wrong, then let the reader open it themselves.
      // Never guess at what it might have said, and never blame a cause that was not established.
      const host = /^https?:\/\//.test(uri) ? new URL(uri).host : uri.startsWith("ipfs://") ? "IPFS" : "its own host";
      const cause =
        viaApi?.reason === "not-a-document"
          ? `answers with a web page rather than a registration document`
          : `could not be read`;
      return {
        ...empty,
        uri,
        homepage: /^https?:\/\//.test(uri) ? uri : undefined,
        unavailable: `This agent's registration at ${host} ${cause}. Open it and judge the words yourself; the facts below were proven either way.`,
      };
    }

    return fromDoc(agentId, uri, doc);
  })();

  cache.set(key, task);
  return task;
}
