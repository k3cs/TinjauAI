import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEPLOYMENT, SOURCES, Tinjau, cc3TxUrl, type HireParams } from "@tinjau/core";
import type { Plan } from "./scout.js";

const DEMO_PARAMS: HireParams = { minAge: 500_000n, minDepth: 2, k: 3n, c: 5n, baseBps: 100, maxBps: 2_000, minAttestors: 0, maxStaleness: 0n };
const plain = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

/**
 * SCT-7: one JSON with everything the web demo and the server's /scout/log need. Numbers are read
 * from the contract at export time; decisions and evidence links come from the latest live plan of
 * each agent (source tx on Ethereum next to the Creditcoin tx that admitted it).
 */
export async function exportDemo(plansDir: string, outFiles: string[], agents: bigint[], log: (l: string) => void) {
  const tinjau = new Tinjau();
  const plans = readdirSync(plansDir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(plansDir, f), "utf8")) as Plan)
    .filter((p) => p.mode === "live" && p.contracts.facts === DEPLOYMENT.facts)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const out = {
    generatedAt: new Date().toISOString(),
    network: "Creditcoin CC3 testnet",
    contracts: DEPLOYMENT,
    params: DEMO_PARAMS,
    attestedTip: { 1: await tinjau.attestedTip(1), 3: await tinjau.attestedTip(3) },
    agents: [] as unknown[],
    runs: plans.map((p) => ({ agentId: p.agentId, startedAt: p.startedAt, target: p.target, r3: p.r3, r4: p.r4, txs: p.txs.map((t) => ({ ...t, url: cc3TxUrl(t.hash) })) })),
  };

  for (const id of agents) {
    const quote = await tinjau.readQuote(3, id, DEMO_PARAMS);
    const clients = await tinjau.clientsOf(3, id);
    const reviewers = [];
    for (const c of clients.slice(0, 32)) {
      reviewers.push({ client: c, pair: await tinjau.pairOf(3, id, c), seniority: await tinjau.seniority(3, c), ownsAgents: await tinjau.ownsAgents(3, c) });
    }
    const mine = plans.filter((p) => p.agentId === id.toString());
    const evidence = mine.flatMap((p) =>
      p.decisions
        .filter((d) => d.status === "chosen" || d.status === "admitted")
        .map((d) => {
          const tx = p.txs.find((t) => t.proofs?.some((h) => h.toLowerCase() === d.tx.toLowerCase()));
          const proof = p.proofs.find((pr) => pr.txHash.toLowerCase() === d.tx.toLowerCase());
          return {
            role: d.role, dir: d.dir, reason: d.reason, sourceTx: d.tx, sourceUrl: SOURCES[p.chainKey].txUrl(d.tx), height: d.height,
            roots: proof?.continuityProof.roots.length, creditcoinTx: tx?.hash, creditcoinUrl: tx ? cc3TxUrl(tx.hash) : undefined, batchGas: tx?.gasUsed,
          };
        }),
    );
    const seenTx = new Set<string>();
    const uniqueEvidence = evidence.filter((e) => e.creditcoinTx && !seenTx.has(e.sourceTx.toLowerCase()) && seenTx.add(e.sourceTx.toLowerCase()));
    const rejected = mine.at(-1)?.decisions.filter((d) => d.status === "rejected").map((d) => ({ role: d.role, reason: d.reason, why: d.why })) ?? [];
    out.agents.push({
      agentId: id,
      registered: await tinjau.isRegistered(3, id),
      owner: await tinjau.ownerOf(3, id),
      facts: quote.facts,
      quote: { riskBps: quote.riskBps, premiumBps: quote.premiumBps, staleness: quote.staleness, gated: quote.facts.gapCount > 0n },
      reviewers,
      evidence: uniqueEvidence,
      rejected,
    });
    log(`[export] agent ${id}: premium ${quote.premiumBps} bps, ${uniqueEvidence.length} evidence rows, ${reviewers.length} reviewers`);
  }
  for (const f of outFiles) {
    mkdirSync(dirname(f), { recursive: true });
    writeFileSync(f, JSON.stringify(plain(out), null, 2));
    log(`[export] wrote ${f}`);
  }
}
