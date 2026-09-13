/**
 * The agent's own registration document, fetched from where its owner put it.
 *
 * The browser can read most of these directly, and does. What it cannot read is a document served by
 * a host that refuses cross-origin requests, which is a large minority of ERC-8004 registrations. A
 * server has no such restriction, so this route exists purely as a fallback for the page: it fetches
 * and returns the document verbatim, without interpreting it. All parsing stays in the browser, so
 * there is exactly one place where a registration is turned into a card, and nothing about the
 * document is invented here.
 */

const ETH_RPC = process.env.ETH_RPC ?? "https://ethereum-rpc.publicnode.com";
const IDENTITY_REGISTRY = "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432";
const TOKEN_URI = "0xc87b56dd"; // tokenURI(uint256)
const IPFS_GATEWAYS = ["https://gateway.pinata.cloud/ipfs/", "https://ipfs.io/ipfs/", "https://dweb.link/ipfs/"];

export interface CardDoc {
  agentId: string;
  uri?: string;
  /** The registration document as published, or null when it could not be fetched. */
  doc: Record<string, unknown> | null;
  /** Why it could not be fetched, when it could not. Never a guess at the contents. */
  note?: string;
  /**
   * What actually went wrong, so the page can say the true thing: "not-a-document" means the host
   * answered with a web page where a registration was promised, "unreachable" means it did not
   * answer at all, "none" means the registry holds no URI for this agent.
   */
  reason?: "none" | "not-a-document" | "unreachable";
}

/** Cached for the life of the process: a registration changes when its owner republishes it, not per request. */
const cache = new Map<string, { at: number; value: CardDoc }>();
const TTL_MS = 10 * 60_000;

function decodeString(hex: string): string | undefined {
  if (!hex || hex === "0x") return undefined;
  const b = hex.slice(2);
  const offset = parseInt(b.slice(0, 64), 16) * 2;
  const length = parseInt(b.slice(offset, offset + 64), 16) * 2;
  if (!Number.isFinite(offset) || !Number.isFinite(length)) return undefined;
  return Buffer.from(b.slice(offset + 64, offset + 64 + length), "hex").toString("utf8");
}

async function tokenUri(agentId: bigint): Promise<string | undefined> {
  const res = await fetch(ETH_RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: AbortSignal.timeout(12_000),
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: IDENTITY_REGISTRY, data: TOKEN_URI + agentId.toString(16).padStart(64, "0") }, "latest"],
    }),
  });
  const json = (await res.json()) as { result?: string };
  return json.result ? decodeString(json.result) : undefined;
}

type Fetched = { doc: Record<string, unknown> } | { failed: "not-a-document" | "unreachable" };

async function fetchJson(url: string): Promise<Fetched> {
  let text: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(9_000), headers: { accept: "application/json" } });
    if (!res.ok) return { failed: "unreachable" };
    text = (await res.text()).slice(0, 100_000);
  } catch {
    return { failed: "unreachable" };
  }
  try {
    return { doc: JSON.parse(text) as Record<string, unknown> };
  } catch {
    return { failed: "not-a-document" }; // an HTML page where a registration was promised
  }
}

async function fetchDoc(uri: string): Promise<Fetched> {
  if (uri.startsWith("data:")) {
    const comma = uri.indexOf(",");
    const [meta, body] = [uri.slice(0, comma), uri.slice(comma + 1)];
    try {
      const text = meta.includes(";base64") ? Buffer.from(body, "base64").toString("utf8") : decodeURIComponent(body);
      return { doc: JSON.parse(text) as Record<string, unknown> };
    } catch {
      return { failed: "not-a-document" };
    }
  }
  if (uri.startsWith("ipfs://")) {
    let last: Fetched = { failed: "unreachable" };
    for (const gw of IPFS_GATEWAYS) {
      last = await fetchJson(gw + uri.slice(7));
      if ("doc" in last) return last;
    }
    return last;
  }
  if (/^https?:\/\//.test(uri)) return fetchJson(uri);
  return { failed: "unreachable" };
}

export async function readCardDoc(agentId: bigint): Promise<CardDoc> {
  const key = agentId.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  let value: CardDoc;
  try {
    const uri = await tokenUri(agentId);
    if (!uri) {
      value = { agentId: key, doc: null, reason: "none", note: "This agent has published no registration document." };
    } else {
      const got = await fetchDoc(uri);
      value =
        "doc" in got
          ? { agentId: key, uri, doc: got.doc }
          : {
              agentId: key,
              uri,
              doc: null,
              reason: got.failed,
              note:
                got.failed === "not-a-document"
                  ? "That address answers with a web page, not a registration document."
                  : "The registration could not be fetched from where it is published.",
            };
    }
  } catch {
    value = { agentId: key, doc: null, reason: "unreachable", note: "Ethereum could not be reached for this agent's registration." };
  }

  cache.set(key, { at: Date.now(), value });
  return value;
}
