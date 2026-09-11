import { Contract, JsonRpcProvider, type ContractRunner, type Signer } from "ethers";
import { groundedFactsAbi } from "./abi/GroundedFacts.js";
import { agentHireEscrowAbi } from "./abi/AgentHireEscrow.js";
import { coverageBountyAbi } from "./abi/CoverageBounty.js";
import { CC3_TESTNET, DEPLOYMENT } from "./config.js";
import type { Facts } from "./facts-model.js";
import type { ContractProof } from "./prover.js";

export interface HireParams {
  minAge: bigint;
  minDepth: number;
  k: bigint;
  c: bigint;
  baseBps: number;
  maxBps: number;
  minAttestors: number;
  maxStaleness: bigint;
}

export interface Quote {
  riskBps: bigint;
  premiumBps: bigint;
  facts: Facts;
  staleness: bigint;
}

export interface Bounty {
  id: bigint;
  funder: string;
  chainKey: number;
  minAge: bigint;
  minDepth: number;
  k: bigint;
  c: bigint;
  expiry: bigint;
  closed: boolean;
  agentId: bigint;
  amount: bigint;
  decision: string;
}

export function cc3Provider(rpc: string = CC3_TESTNET.rpc) {
  return new JsonRpcProvider(rpc, CC3_TESTNET.chainId, { staticNetwork: true });
}

export function toFacts(r: unknown): Facts {
  const x = r as Record<string, unknown> & unknown[];
  return {
    breadthRaw: x[0] as bigint,
    breadthGrounded: x[1] as bigint,
    breadthIndependent: x[2] as bigint,
    gapCount: x[3] as bigint,
    negatives: x[4] as bigint,
    cloneDensityLB: x[5] as bigint,
    registrantSiblings: x[6] as bigint,
    uriSiblings: x[7] as bigint,
    sameTxSiblings: x[8] as bigint,
    firstRegisteredHeight: x[9] as bigint,
    coveredThrough: x[10] as bigint,
    minAttestors: Number(x[11]),
    truncated: x[12] as boolean,
  };
}

/** Typed access to the three Tinjau contracts. */
export class Tinjau {
  readonly facts: Contract;
  readonly escrow: Contract;
  readonly bounty: Contract;

  constructor(runner: ContractRunner = cc3Provider(), addrs = DEPLOYMENT) {
    this.facts = new Contract(addrs.facts, groundedFactsAbi, runner);
    this.escrow = new Contract(addrs.escrow, agentHireEscrowAbi, runner);
    this.bounty = new Contract(addrs.bounty, coverageBountyAbi, runner);
  }

  static withSigner(signer: Signer, addrs = DEPLOYMENT) {
    return new Tinjau(signer, addrs);
  }

  async readFacts(chainKey: number, agentId: bigint, minAge: bigint, minDepth: number): Promise<Facts> {
    return toFacts(await this.facts.facts(chainKey, agentId, minAge, minDepth));
  }

  async readQuote(chainKey: number, agentId: bigint, p: HireParams): Promise<Quote> {
    const [riskBps, premiumBps, f, staleness] = await this.escrow.quote(chainKey, agentId, p);
    return { riskBps, premiumBps, facts: toFacts(f), staleness };
  }

  async isRegistered(chainKey: number, agentId: bigint): Promise<boolean> {
    return this.facts.isRegistered(chainKey, agentId);
  }

  async ownerOf(chainKey: number, agentId: bigint): Promise<string> {
    return this.facts.ownerOf(chainKey, agentId);
  }

  async attestedTip(chainKey: number): Promise<bigint> {
    return this.facts.attestedTip(chainKey);
  }

  async clientsOf(chainKey: number, agentId: bigint): Promise<string[]> {
    return [...(await this.facts.clientsOf(chainKey, agentId))];
  }

  async seniority(chainKey: number, reviewer: string): Promise<{ oldest: bigint; buckets: number }> {
    const a = await this.facts.reviewerSeniority(chainKey, reviewer);
    return { oldest: a[0], buckets: Number(a[1]) };
  }

  async pairOf(chainKey: number, agentId: bigint, client: string) {
    const p = await this.facts.pairOf(chainKey, agentId, client);
    return { maxIndex: p[0] as bigint, known: p[1] as bigint, active: p[2] as bigint, firstHeight: p[3] as bigint, listed: p[4] as boolean };
  }

  async ownsAgents(chainKey: number, who: string): Promise<bigint> {
    return this.facts.reviewerOwnsAgents(chainKey, who);
  }

  async isAdmitted(chainKey: number, height: bigint, txIndex: bigint): Promise<boolean> {
    const { AbiCoder, keccak256 } = await import("ethers");
    const key = keccak256(AbiCoder.defaultAbiCoder().encode(["uint64", "uint64", "uint64"], [chainKey, height, txIndex]));
    return this.facts.admittedTx(key);
  }

  async openBounties(now = BigInt(Math.floor(Date.now() / 1000))): Promise<Bounty[]> {
    const n: bigint = await this.bounty.bountyCount();
    const out: Bounty[] = [];
    for (let i = 0n; i < n; i++) {
      const b = await this.bounty.bountyOf(i);
      const bounty: Bounty = {
        id: i, funder: b[0], chainKey: Number(b[1]), minAge: b[2], minDepth: Number(b[3]), k: b[4], c: b[5],
        expiry: b[6], closed: b[7], agentId: b[8], amount: b[9], decision: b[10],
      };
      if (!bounty.closed && bounty.expiry > now) out.push(bounty);
    }
    return out;
  }

  async record(proofs: ContractProof[]) {
    return this.facts.record(proofs);
  }

  async proveAndClaim(bountyId: bigint, proofs: ContractProof[]) {
    return this.bounty.proveAndClaim(bountyId, proofs);
  }

  async fund(chainKey: number, agentId: bigint, minAge: bigint, minDepth: number, k: bigint, c: bigint, expiry: bigint, value: bigint) {
    return this.bounty.fund(chainKey, agentId, minAge, minDepth, k, c, expiry, { value });
  }

  async hire(chainKey: number, agentId: bigint, p: HireParams, deadline: bigint, value: bigint) {
    return this.escrow.hire(chainKey, agentId, p, deadline, { value });
  }

  async release(jobId: bigint) {
    return this.escrow.release(jobId);
  }
}
