import { TOPICS, decodeFeedbackData, sourceOf, topicToAddress } from "@tinjau/core";
import { Blockscout, type RawLog, type RawTx } from "./blockscout.js";

export interface Review {
  client: string;
  index: bigint;
  value: bigint;
  tx: string;
  height: number;
  txIndex: number;
}

export interface AgentData {
  chainKey: number;
  agentId: bigint;
  registration?: { tx: string; height: number; txIndex: number; owner: string };
  reviews: Review[];
  revocations: { client: string; index: bigint; tx: string; height: number; txIndex: number }[];
  ownerRegistrations: { agentId: bigint; tx: string; height: number; txIndex: number }[];
}

export interface ReviewerData {
  address: string;
  /** Oldest-first txs sent by the reviewer (as far as Blockscout returns). */
  sent: RawTx[];
  /** False if Blockscout returned only part of the history (older txs may exist). */
  complete: boolean;
  /** Agents this reviewer registered as owner (Registered topic2). */
  ownRegistrations: { agentId: bigint; tx: string; height: number; txIndex: number }[];
}

const pad = (n: bigint) => "0x" + n.toString(16).padStart(64, "0");
const padAddr = (a: string) => "0x" + a.toLowerCase().replace(/^0x/, "").padStart(64, "0");

export class Discovery {
  readonly bs: Blockscout;
  constructor(readonly chainKey: number, cacheDir: string) {
    this.bs = new Blockscout(sourceOf(chainKey).blockscout, cacheDir);
  }

  private async withIndex<T extends { transactionHash: string }>(logs: T[]) {
    const out: (T & { txIndex: number })[] = [];
    for (const l of logs) out.push({ ...l, txIndex: await this.bs.txIndex(l.transactionHash) });
    return out;
  }

  async agent(agentId: bigint): Promise<AgentData> {
    const src = sourceOf(this.chainKey);
    const id = pad(agentId);
    const idLogs = await this.bs.logs(src.identityRegistry, id);
    const repLogs = await this.bs.logs(src.reputationRegistry, id);
    const reg = await this.withIndex(idLogs.filter((l) => l.topics[0] === TOPICS.Registered && l.topics[1] === id));
    const fb = await this.withIndex(repLogs.filter((l) => l.topics[0] === TOPICS.NewFeedback && l.topics[1] === id));
    const rv = await this.withIndex(repLogs.filter((l) => l.topics[0] === TOPICS.FeedbackRevoked && l.topics[1] === id));
    const r0 = reg[0];
    const owner = r0 ? topicToAddress(r0.topics[2]) : undefined;
    const ownerRegs = owner ? await this.registrationsOf(owner) : [];
    return {
      chainKey: this.chainKey,
      agentId,
      registration: r0 && owner ? { tx: r0.transactionHash, height: r0.blockNumber, txIndex: r0.txIndex, owner } : undefined,
      reviews: fb.map((l) => {
        const { index, value } = decodeFeedbackData(l.data);
        return { client: topicToAddress(l.topics[2]), index, value, tx: l.transactionHash, height: l.blockNumber, txIndex: l.txIndex };
      }),
      revocations: rv.map((l) => ({ client: topicToAddress(l.topics[2]), index: BigInt(l.topics[3]), tx: l.transactionHash, height: l.blockNumber, txIndex: l.txIndex })),
      ownerRegistrations: ownerRegs,
    };
  }

  /** Agents registered with `owner` as the Registered owner (identity registry). */
  async registrationsOf(owner: string, limit = 20) {
    const src = sourceOf(this.chainKey);
    const topic = padAddr(owner);
    const logs = (await this.bs.logs(src.identityRegistry, topic, { maxPages: 6 })).filter((l: RawLog) => l.topics[0] === TOPICS.Registered && l.topics[2] === topic);
    const withIdx = await this.withIndex(logs.slice(0, limit));
    return withIdx.map((l) => ({ agentId: BigInt(l.topics[1]), tx: l.transactionHash, height: l.blockNumber, txIndex: l.txIndex }));
  }

  /** Oldest-first txs sent by a reviewer (up to 4 pages of 50); `complete` false = older history unseen. */
  async reviewer(address: string): Promise<ReviewerData> {
    const { txs, complete } = await this.bs.sentTxs(address, 4);
    return { address, sent: txs, complete, ownRegistrations: await this.registrationsOf(address, 3) };
  }

  /** Agents with the most NewFeedback logs in the last `blocks` source blocks. */
  async mostReviewed(blocks: number, limit: number): Promise<{ agentId: bigint; reviews: number }[]> {
    const src = sourceOf(this.chainKey);
    const tip = await this.bs.latestBlock();
    const logs = await this.bs.logs(src.reputationRegistry, TOPICS.NewFeedback, { maxPages: 20, stopBelow: tip - blocks, cache: false });
    const count = new Map<bigint, number>();
    for (const l of logs) {
      if (l.blockNumber < tip - blocks || l.topics[0] !== TOPICS.NewFeedback) continue;
      const id = BigInt(l.topics[1]);
      count.set(id, (count.get(id) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([agentId, reviews]) => ({ agentId, reviews }));
  }
}
