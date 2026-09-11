import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FactsModel, Tinjau, DEPLOYMENT, type Facts, type ProofResponse } from "@tinjau/core";
import type { Plan } from "./scout.js";

/**
 * Recompute facts off-chain from every proof the scout sent (live plans) and compare them with
 * `facts()` on-chain. Attestor counts per admitted tx are read from the contract's TxAdmitted events,
 * so the comparison covers `minAttestors` too.
 */
export async function verifyAll(plansDir: string, agents: bigint[], chainKey: number, minAge: bigint, minDepth: number, log: (l: string) => void) {
  const plans = readdirSync(plansDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(plansDir, f), "utf8")) as Plan)
    .filter((p) => p.mode === "live" && p.contracts.facts === DEPLOYMENT.facts);
  const sentHashes = new Set(plans.flatMap((p) => p.txs.flatMap((t) => t.proofs ?? [])).map((h) => h.toLowerCase()));
  const proofs = new Map<string, ProofResponse>();
  for (const p of plans) for (const pr of p.proofs) if (sentHashes.has(pr.txHash.toLowerCase())) proofs.set(`${pr.chainKey}:${pr.headerNumber}:${pr.txIndex}`, pr);

  const tinjau = new Tinjau();
  const events = await tinjau.facts.queryFilter(tinjau.facts.filters.TxAdmitted(), await deployBlock(tinjau));
  const attestors = new Map<string, number>();
  for (const e of events) {
    const a = (e as unknown as { args: [bigint, bigint, bigint, string, bigint] }).args;
    attestors.set(`${a[0]}:${a[1]}:${a[2]}`, Number(a[4]));
  }
  const onChainKeys = new Set(attestors.keys());
  const missing = [...onChainKeys].filter((k) => !proofs.has(k));
  log(`[verify] ${proofs.size} proofs in local plans, ${onChainKeys.size} txs admitted on-chain${missing.length ? `, ${missing.length} admitted by others (not in local plans)` : ""}`);

  const model = new FactsModel();
  const ordered = [...proofs.values()].filter((p) => onChainKeys.has(`${p.chainKey}:${p.headerNumber}:${p.txIndex}`));
  for (const p of ordered) {
    model.admit({ chainKey: p.chainKey, height: BigInt(p.headerNumber), txIndex: BigInt(p.txIndex), txBytes: p.txBytes, attestors: attestors.get(`${p.chainKey}:${p.headerNumber}:${p.txIndex}`) });
  }

  const ids = agents.length ? agents : [...new Set(plans.map((p) => BigInt(p.agentId)))];
  let ok = missing.length === 0;
  for (const id of ids) {
    const off = model.facts(chainKey, id, minAge, minDepth);
    const on = await tinjau.readFacts(chainKey, id, minAge, minDepth);
    const diff = diffFacts(off, on);
    log(`[verify] agent ${id} minAge=${minAge} minDepth=${minDepth}: ${diff.length ? "MISMATCH " + diff.join(", ") : "identical"} ${fmt(on)}`);
    if (diff.length) ok = false;
  }
  if (missing.length) log("[verify] note: recompute only covers proofs present locally; facts touched by other admitters may differ");
  return ok;
}

async function deployBlock(t: Tinjau): Promise<number> {
  const rc = await t.facts.runner!.provider!.getTransactionReceipt(DEPLOYMENT.txs.facts);
  return rc?.blockNumber ?? 0;
}

function diffFacts(a: Facts, b: Facts): string[] {
  return (Object.keys(a) as (keyof Facts)[]).filter((k) => a[k] !== b[k]).map((k) => `${String(k)}: off ${a[k]} vs on ${b[k]}`);
}

export function fmt(f: Facts): string {
  return `(raw ${f.breadthRaw}, grounded ${f.breadthGrounded}, independent ${f.breadthIndependent}, gaps ${f.gapCount}, negatives ${f.negatives}, clones ${f.cloneDensityLB}, registrantSib ${f.registrantSiblings}, uriSib ${f.uriSiblings}, sameTx ${f.sameTxSiblings}, registered@${f.firstRegisteredHeight}, covered@${f.coveredThrough}, attestors ${f.minAttestors}, truncated ${f.truncated})`;
}
