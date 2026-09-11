import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  logIndex: number;
}

export interface RawTx {
  hash: string;
  blockNumber: number;
  transactionIndex: number;
  from: string;
  isError: boolean;
}

/**
 * Blockscout REST v2 client for discovery (the Etherscan-style /api is rate-limited much harder on
 * the free tier). Discovery only chooses *what* to prove; nothing from here reaches the contract
 * without an Attestcoin proof of the transaction itself.
 */
export class Blockscout {
  private last = 0;

  constructor(
    readonly base: string,
    private readonly cacheDir: string,
    private readonly minIntervalMs = 400,
  ) {
    mkdirSync(cacheDir, { recursive: true });
  }

  async latestBlock(): Promise<number> {
    const r = (await this.get("/blocks", { type: "block" }, false)) as { items: { height: number }[] };
    return r.items[0].height;
  }

  /** Logs emitted by `address` with `topic` in any position, newest first; optional stop height. */
  async logs(address: string, topic: string | undefined, opts: { maxPages?: number; stopBelow?: number; cache?: boolean } = {}): Promise<RawLog[]> {
    const out: RawLog[] = [];
    let params: Record<string, string> = topic ? { topic } : {};
    for (let page = 0; page < (opts.maxPages ?? 40); page++) {
      const r = (await this.get(`/addresses/${address}/logs`, params, opts.cache ?? true)) as {
        items: { address: { hash: string }; topics: (string | null)[]; data: string; block_number: number; transaction_hash: string; index: number }[];
        next_page_params: Record<string, string | number> | null;
      };
      for (const l of r.items) {
        out.push({
          address: l.address.hash,
          topics: l.topics.filter((t): t is string => !!t),
          data: l.data,
          blockNumber: l.block_number,
          transactionHash: l.transaction_hash,
          logIndex: l.index,
        });
      }
      const lastItem = r.items[r.items.length - 1];
      if (!r.next_page_params || (opts.stopBelow && lastItem && lastItem.block_number < opts.stopBelow)) break;
      params = Object.fromEntries(Object.entries(r.next_page_params).map(([k, v]) => [k, String(v)]));
    }
    return out;
  }

  /** Transactions sent by `address`, oldest first (up to maxPages × 50). `complete` = history exhausted. */
  async sentTxs(address: string, maxPages = 10): Promise<{ txs: RawTx[]; complete: boolean }> {
    const out: RawTx[] = [];
    let params: Record<string, string> = { filter: "from" };
    let complete = false;
    for (let page = 0; page < maxPages; page++) {
      const r = (await this.get(`/addresses/${address}/transactions`, params, true)) as {
        items: { hash: string; block_number: number; position: number; from: { hash: string }; status: string }[];
        next_page_params: Record<string, string | number> | null;
      };
      for (const t of r.items) {
        if (t.from.hash.toLowerCase() !== address.toLowerCase()) continue;
        out.push({ hash: t.hash, blockNumber: t.block_number, transactionIndex: t.position, from: t.from.hash, isError: t.status !== "ok" });
      }
      if (!r.next_page_params) {
        complete = true;
        break;
      }
      params = { filter: "from", ...Object.fromEntries(Object.entries(r.next_page_params).map(([k, v]) => [k, String(v)])) };
    }
    return { txs: out.sort((a, b) => a.blockNumber - b.blockNumber || a.transactionIndex - b.transactionIndex), complete };
  }

  /** Position of a tx inside its block (the Attestcoin txIndex). */
  async txIndex(hash: string): Promise<number> {
    const r = (await this.get(`/transactions/${hash}`, {}, true)) as { position: number };
    return r.position;
  }

  private async get(path: string, params: Record<string, string>, cache: boolean): Promise<unknown> {
    const qs = new URLSearchParams(params).toString();
    const url = `${this.base}/api/v2${path}${qs ? "?" + qs : ""}`;
    const file = join(this.cacheDir, createHash("sha1").update(url).digest("hex") + ".json");
    if (cache && existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
    for (let attempt = 0; attempt < 7; attempt++) {
      const wait = this.last + this.minIntervalMs - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      this.last = Date.now();
      const res = await fetch(url, { headers: { "user-agent": "tinjau-scout/3", accept: "application/json" } });
      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, 3_000 * 2 ** attempt));
        continue;
      }
      if (!res.ok) throw new Error(`blockscout ${res.status} ${url}: ${(await res.text()).slice(0, 200)}`);
      const body = await res.json();
      if (cache) writeFileSync(file, JSON.stringify(body));
      return body;
    }
    throw new Error(`blockscout: gave up on ${url}`);
  }
}
