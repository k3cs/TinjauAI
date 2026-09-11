import { BUCKET, MAX_REVIEWERS, SOURCES, TOPICS } from "./config.js";
import { decodeFeedbackData, decodeRegisteredUri, decodeTxBytes, topicToAddress, topicToBigInt } from "./decode.js";
import { keccak256, toUtf8Bytes } from "ethers";

/**
 * Off-chain mirror of GroundedFacts. Feed it the same proofs the contract admitted and it returns
 * the same numbers as `facts()`. This is how anyone checks the bureau without trusting it.
 * Keep this file in lock-step with contracts/src/GroundedFacts.sol.
 */

export interface AdmittedTx {
  chainKey: number;
  height: bigint;
  txIndex: bigint;
  txBytes: string;
  /** Bonded attestors when the proof was admitted (AttestorStash); undefined if unknown. */
  attestors?: number;
}

export interface Facts {
  breadthRaw: bigint;
  breadthGrounded: bigint;
  breadthIndependent: bigint;
  gapCount: bigint;
  negatives: bigint;
  cloneDensityLB: bigint;
  registrantSiblings: bigint;
  uriSiblings: bigint;
  sameTxSiblings: bigint;
  firstRegisteredHeight: bigint;
  coveredThrough: bigint;
  minAttestors: number;
  truncated: boolean;
}

interface Pair {
  maxIndex: bigint;
  known: bigint;
  active: bigint;
  firstHeight: bigint;
  listed: boolean;
}

interface Agent {
  owner: string;
  registrant: string;
  uriHash: string | null;
  txKey: string;
  registeredHeight: bigint;
  lastOwnerUpdate: bigint;
  transfersProven: number;
}

const SEEN = 1;
const NEGATIVE = 2;
const REVOKED = 4;

export class FactsModel {
  private admitted = new Set<string>();
  private activity = new Map<string, { oldest: bigint; buckets: Set<bigint> }>();
  private pairs = new Map<string, Pair>();
  private reviewState = new Map<string, number>();
  private clients = new Map<string, string[]>();
  private negatives = new Map<string, bigint>();
  private agents = new Map<string, Agent>();
  private meta = new Map<string, { coveredThrough: bigint; minAttestors: number }>();
  private ownerCount = new Map<string, bigint>();
  private registrantCount = new Map<string, bigint>();
  private uriCount = new Map<string, bigint>();
  private txRegisteredCount = new Map<string, bigint>();

  /** @returns true if the tx was new (duplicates are skipped, like the contract). */
  admit(tx: AdmittedTx): boolean {
    const src = SOURCES[tx.chainKey];
    if (!src) throw new Error(`UnknownChain(${tx.chainKey})`);
    const txKey = `${tx.chainKey}:${tx.height}:${tx.txIndex}`;
    if (this.admitted.has(txKey)) return false;
    this.admitted.add(txKey);

    const d = decodeTxBytes(tx.txBytes);
    this.recordActivity(tx.chainKey, d.from, tx.height);
    const attestors = tx.attestors ?? 0;
    if (d.status === 1) {
      const ctx = { chainKey: tx.chainKey, height: tx.height, txIndex: tx.txIndex, txKey, from: d.from, attestors };
      d.logs.forEach((lg, logIndex) => {
        if (lg.topics.length === 0) return;
        const emitter = lg.address.toLowerCase();
        if (emitter === src.reputationRegistry.toLowerCase()) this.onReputationLog(ctx, lg.topics, lg.data);
        else if (emitter === src.identityRegistry.toLowerCase()) this.onIdentityLog(ctx, lg.topics, lg.data, logIndex);
      });
    }
    return true;
  }

  facts(chainKey: number, agentId: bigint, minAge: bigint, minDepth: number): Facts {
    const aKey = agentKey(chainKey, agentId);
    const list = this.clients.get(aKey) ?? [];
    const f: Facts = {
      breadthRaw: 0n, breadthGrounded: 0n, breadthIndependent: 0n, gapCount: 0n, negatives: 0n,
      cloneDensityLB: 0n, registrantSiblings: 0n, uriSiblings: 0n, sameTxSiblings: 0n,
      firstRegisteredHeight: 0n, coveredThrough: 0n, minAttestors: 0, truncated: list.length > MAX_REVIEWERS,
    };
    for (const client of list.slice(0, MAX_REVIEWERS)) {
      const pair = this.pairs.get(pairKey(chainKey, agentId, client))!;
      if (pair.maxIndex > pair.known) f.gapCount++;
      if (pair.active === 0n) continue;
      f.breadthRaw++;
      if ((this.ownerCount.get(ck(chainKey, client)) ?? 0n) === 0n) f.breadthIndependent++;
      const a = this.activity.get(ck(chainKey, client));
      if (
        a && pair.maxIndex === pair.known && a.oldest <= pair.firstHeight &&
        pair.firstHeight - a.oldest >= minAge && a.buckets.size >= minDepth
      ) f.breadthGrounded++;
    }
    f.negatives = this.negatives.get(aKey) ?? 0n;
    const ag = this.agents.get(aKey);
    if (ag) {
      f.cloneDensityLB = minusOne(this.ownerCount.get(ck(chainKey, ag.owner)) ?? 0n);
      f.registrantSiblings = minusOne(this.registrantCount.get(ck(chainKey, ag.registrant)) ?? 0n);
      f.uriSiblings = ag.uriHash ? minusOne(this.uriCount.get(ck(chainKey, ag.uriHash)) ?? 0n) : 0n;
      f.sameTxSiblings = minusOne(this.txRegisteredCount.get(ag.txKey) ?? 0n);
      f.firstRegisteredHeight = ag.registeredHeight;
    }
    const m = this.meta.get(aKey);
    if (m) {
      f.coveredThrough = m.coveredThrough;
      f.minAttestors = m.minAttestors;
    }
    return f;
  }

  ownerOf(chainKey: number, agentId: bigint): string | undefined {
    return this.agents.get(agentKey(chainKey, agentId))?.owner;
  }

  reviewersOf(chainKey: number, agentId: bigint): string[] {
    return [...(this.clients.get(agentKey(chainKey, agentId)) ?? [])];
  }

  pairOf(chainKey: number, agentId: bigint, client: string): Pair | undefined {
    return this.pairs.get(pairKey(chainKey, agentId, client));
  }

  seniorityOf(chainKey: number, who: string): { oldest: bigint; buckets: number } | undefined {
    const a = this.activity.get(ck(chainKey, who));
    return a ? { oldest: a.oldest, buckets: a.buckets.size } : undefined;
  }

  ownsAgents(chainKey: number, who: string): bigint {
    return this.ownerCount.get(ck(chainKey, who)) ?? 0n;
  }

  // ------------------------------------------------------------------ internals

  private recordActivity(chainKey: number, who: string, height: bigint) {
    const key = ck(chainKey, who);
    let a = this.activity.get(key);
    if (!a) this.activity.set(key, (a = { oldest: height, buckets: new Set() }));
    if (height < a.oldest) a.oldest = height;
    a.buckets.add(height / BUCKET);
  }

  private onReputationLog(ctx: Ctx, topics: string[], data: string) {
    if (topics[0] === TOPICS.NewFeedback && topics.length >= 3 && (data.length - 2) / 2 >= 64) {
      const { index, value } = decodeFeedbackData(data);
      this.onReview(ctx, topicToBigInt(topics[1]), topicToAddress(topics[2]), index, value);
    } else if (topics[0] === TOPICS.FeedbackRevoked && topics.length >= 4) {
      this.onRevoke(ctx, topicToBigInt(topics[1]), topicToAddress(topics[2]), topicToBigInt(topics[3]));
    }
  }

  private pair(chainKey: number, agentId: bigint, client: string): [string, Pair] {
    const pk = pairKey(chainKey, agentId, client);
    let p = this.pairs.get(pk);
    if (!p) this.pairs.set(pk, (p = { maxIndex: 0n, known: 0n, active: 0n, firstHeight: 0n, listed: false }));
    return [pk, p];
  }

  private onReview(ctx: Ctx, agentId: bigint, client: string, index: bigint, value: bigint) {
    const aKey = agentKey(ctx.chainKey, agentId);
    const [pk, pair] = this.pair(ctx.chainKey, agentId, client);
    const sKey = `${pk}#${index}`;
    const state = this.reviewState.get(sKey) ?? 0;
    if (state & SEEN) return;
    if (state === 0) pair.known++;
    const next = state | SEEN | (value < 0n ? NEGATIVE : 0);
    this.reviewState.set(sKey, next);
    if ((next & REVOKED) === 0) {
      pair.active++;
      if (value < 0n) this.negatives.set(aKey, (this.negatives.get(aKey) ?? 0n) + 1n);
    }
    if (index > pair.maxIndex) pair.maxIndex = index;
    if (pair.firstHeight === 0n || ctx.height < pair.firstHeight) pair.firstHeight = ctx.height;
    this.list(aKey, pair, client);
    this.touch(aKey, ctx);
  }

  private onRevoke(ctx: Ctx, agentId: bigint, client: string, index: bigint) {
    const aKey = agentKey(ctx.chainKey, agentId);
    const [pk, pair] = this.pair(ctx.chainKey, agentId, client);
    const sKey = `${pk}#${index}`;
    const state = this.reviewState.get(sKey) ?? 0;
    if (state & REVOKED) return;
    if (state === 0) pair.known++;
    if (state & SEEN) {
      pair.active--;
      if (state & NEGATIVE) this.negatives.set(aKey, (this.negatives.get(aKey) ?? 0n) - 1n);
    }
    this.reviewState.set(sKey, state | REVOKED);
    if (index > pair.maxIndex) pair.maxIndex = index;
    this.list(aKey, pair, client);
    this.touch(aKey, ctx);
  }

  private onIdentityLog(ctx: Ctx, topics: string[], data: string, logIndex: number) {
    if (topics[0] === TOPICS.Registered && topics.length >= 3) {
      const uri = decodeRegisteredUri(data);
      this.onRegistered(ctx, topicToBigInt(topics[1]), topicToAddress(topics[2]), uri.length === 0 ? null : keccak256(toUtf8Bytes(uri)), logIndex);
    } else if (topics[0] === TOPICS.Transfer && topics.length >= 4) {
      const from = topicToAddress(topics[1]);
      if (BigInt(from) === 0n) return;
      this.onTransfer(ctx, topicToBigInt(topics[3]), topicToAddress(topics[2]), logIndex);
    }
  }

  private onRegistered(ctx: Ctx, agentId: bigint, owner: string, uriHash: string | null, logIndex: number) {
    const aKey = agentKey(ctx.chainKey, agentId);
    if (this.agents.has(aKey)) return;
    this.agents.set(aKey, {
      owner, registrant: ctx.from, uriHash, txKey: ctx.txKey, registeredHeight: ctx.height,
      lastOwnerUpdate: order(ctx, logIndex), transfersProven: 0,
    });
    inc(this.ownerCount, ck(ctx.chainKey, owner), 1n);
    inc(this.registrantCount, ck(ctx.chainKey, ctx.from), 1n);
    if (uriHash) inc(this.uriCount, ck(ctx.chainKey, uriHash), 1n);
    inc(this.txRegisteredCount, ctx.txKey, 1n);
    this.touch(aKey, ctx);
  }

  private onTransfer(ctx: Ctx, agentId: bigint, to: string, logIndex: number) {
    const aKey = agentKey(ctx.chainKey, agentId);
    const ag = this.agents.get(aKey);
    if (!ag) return;
    const ord = order(ctx, logIndex);
    if (ord <= ag.lastOwnerUpdate) return;
    ag.lastOwnerUpdate = ord;
    ag.transfersProven++;
    if (ag.owner !== to) {
      inc(this.ownerCount, ck(ctx.chainKey, ag.owner), -1n);
      inc(this.ownerCount, ck(ctx.chainKey, to), 1n);
      ag.owner = to;
    }
    this.touch(aKey, ctx);
  }

  private list(aKey: string, pair: Pair, client: string) {
    if (!pair.listed) {
      pair.listed = true;
      const l = this.clients.get(aKey) ?? [];
      l.push(client);
      this.clients.set(aKey, l);
    }
  }

  private touch(aKey: string, ctx: Ctx) {
    const m = this.meta.get(aKey);
    if (!m) this.meta.set(aKey, { coveredThrough: ctx.height, minAttestors: ctx.attestors });
    else {
      if (ctx.height > m.coveredThrough) m.coveredThrough = ctx.height;
      if (ctx.attestors < m.minAttestors) m.minAttestors = ctx.attestors;
    }
  }
}

interface Ctx {
  chainKey: number;
  height: bigint;
  txIndex: bigint;
  txKey: string;
  from: string;
  attestors: number;
}

const agentKey = (chainKey: number, agentId: bigint) => `${chainKey}:${agentId}`;
const pairKey = (chainKey: number, agentId: bigint, client: string) => `${chainKey}:${agentId}:${client}`;
const ck = (chainKey: number, s: string) => `${chainKey}:${s}`;
const minusOne = (x: bigint) => (x === 0n ? 0n : x - 1n);
const order = (ctx: Ctx, logIndex: number) => (ctx.height << 64n) | (ctx.txIndex << 32n) | BigInt(logIndex);
function inc(m: Map<string, bigint>, k: string, d: bigint) {
  m.set(k, (m.get(k) ?? 0n) + d);
}
