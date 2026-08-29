import { ethers } from "ethers";
import type { Facts, Quote, Thresholds } from "./types";

export const CC3_RPC = import.meta.env.VITE_CC3_RPC ?? "https://rpc.cc3-testnet.creditcoin.network";
export const FACTS_ADDR = (import.meta.env.VITE_FACTS as string | undefined) ?? "";
export const ESCROW_ADDR = (import.meta.env.VITE_ESCROW as string | undefined) ?? "";
export const PROVER = "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1";

const FACTS_ABI = ["function facts(uint64,uint256,uint64,uint32) view returns ((uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))", "function clientsOf(uint64,uint256) view returns (address[])"];
const ESCROW_ABI = ["function quote(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16)) view returns (uint256,uint16,uint64,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64))"];

export const live = () => FACTS_ADDR.length === 42;

export async function attestedHeight(chainKey: number): Promise<number | null> {
  try { const r = await fetch(`${PROVER}/attested-height/${chainKey}`); return Number((await r.json()).attestedHeight); } catch { return null; }
}

export async function liveFacts(chainKey: number, agentId: string, t: Thresholds): Promise<Facts> {
  const p = new ethers.JsonRpcProvider(CC3_RPC); const c = new ethers.Contract(FACTS_ADDR, FACTS_ABI, p);
  const f = await c.facts(chainKey, agentId, t.minAge, t.minDepth);
  return { breadthRaw: Number(f[0]), breadthGrounded: Number(f[1]), breadthIndependent: Number(f[2]), gapCount: Number(f[3]), negatives: Number(f[4]), cloneDensityLB: Number(f[5]), registrantSiblings: Number(f[6]), uriSiblings: Number(f[7]), sameTxSiblings: Number(f[8]), firstRegisteredHeight: f[9].toString() };
}

/** Same formula as AgentHireEscrow.quote (base 1% .. max 20%). Used in demo mode and as a cross-check in live mode. */
export function quoteLocal(f: Facts, t: Thresholds, baseBps = 100, maxBps = 2000): Quote {
  const coverage = Math.min(10_000, Math.floor((f.breadthGrounded * 10_000) / Math.max(1, t.k)));
  const cloneFactor = t.c === 0 ? (f.cloneDensityLB === 0 ? 10_000 : 0) : Math.floor((t.c * 10_000) / (t.c + f.cloneDensityLB));
  const riskBps = 10_000 - Math.floor((coverage * cloneFactor) / 10_000);
  const premiumBps = baseBps + Math.floor(((maxBps - baseBps) * riskBps) / 10_000);
  return { riskBps, premiumBps, gated: f.gapCount > 0 };
}

export async function liveQuote(chainKey: number, agentId: string, t: Thresholds): Promise<Quote> {
  const p = new ethers.JsonRpcProvider(CC3_RPC); const c = new ethers.Contract(ESCROW_ADDR, ESCROW_ABI, p);
  const q = await c.quote(chainKey, agentId, [t.minAge, t.minDepth, t.k, t.c, 100, 2000]);
  return { riskBps: Number(q[0]), premiumBps: Number(q[1]), gated: Number(q[2]) > 0 };
}
