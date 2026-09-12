#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Wallet, formatEther } from "ethers";
import { ProverClient, Tinjau, cc3Provider, toContractProof } from "@tinjau/core";
import { runScout } from "./scout.js";
import { verifyAll } from "./verify.js";
import { exportDemo } from "./export.js";

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = join(here, "..");
const repoRoot = join(pkgRoot, "../..");

function loadEnv() {
  const f = join(repoRoot, ".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

function args(argv: string[]) {
  const out: Record<string, string> = {};
  const rest: string[] = [];
  for (const a of argv) {
    const m = a.match(/^--([^=]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] ?? "true";
    else rest.push(a);
  }
  return { flags: out, rest };
}

async function main() {
  loadEnv();
  const [cmd, ...argv] = process.argv.slice(2);
  const { flags, rest } = args(argv);
  const plansDir = flags.plans ?? join(pkgRoot, "plans");
  const logFile = flags.log ? join(plansDir, flags.log) : undefined;
  if (logFile) mkdirSync(plansDir, { recursive: true });
  const log = (l: string) => {
    console.log(l);
    if (logFile) appendFileSync(logFile, l + "\n");
  };

  if (cmd === "scout") {
    const live = flags.live === "true";
    if (live && !process.env.PRIVATE_KEY) throw new Error("--live needs PRIVATE_KEY in .env");
    await runScout({
      chainKey: Number(flags.chainKey ?? 3),
      agents: (flags.agents ?? "").split(",").filter(Boolean).map(BigInt),
      maxTargets: Number(flags.maxTargets ?? 2),
      thresholds: {
        minAge: BigInt(flags.minAge ?? 500_000),
        minDepth: Number(flags.minDepth ?? 2),
        k: BigInt(flags.k ?? 3),
        c: BigInt(flags.c ?? 5),
      },
      gasBudget: Number(flags.gasBudget ?? 9_000_000),
      maxReviewersScanned: Number(flags.scan ?? 20),
      helpShare: Number(flags.helpShare ?? 0.6),
      gapProofs: (flags.gapProofs ?? "conflicted") as "conflicted" | "all" | "none",
      hireWei: BigInt(flags.hireWei ?? 0),
      maxPremiumBps: BigInt(flags.maxPremiumBps ?? 500),
      fundWei: BigInt(flags.fundWei ?? 0),
      privateKey: live ? process.env.PRIVATE_KEY : undefined,
      plansDir,
      cacheDir: join(pkgRoot, "cache"),
      log,
    });
    return;
  }

  if (cmd === "verify") {
    // DEP-6: recompute facts from every proof in plans/ and compare with the contract.
    const ok = await verifyAll(plansDir, rest.map(BigInt), Number(flags.chainKey ?? 3), BigInt(flags.minAge ?? 500_000), Number(flags.minDepth ?? 2), log);
    process.exit(ok ? 0 : 1);
  }

  if (cmd === "record-one") {
    // Admit one source tx by hash: record-one <chainKey> <txHash>
    const [ck, hash] = rest;
    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY missing");
    const signer = new Wallet(pk, cc3Provider());
    const p = await new ProverClient().proofByTx(Number(ck), hash);
    const tx = await Tinjau.withSigner(signer).record([toContractProof(p)]);
    const rc = await tx.wait();
    log(`[tx] record 1 proof ${tx.hash} block ${rc!.blockNumber} gas ${rc!.gasUsed} (source ${hash}, height ${p.headerNumber}, ${p.continuityProof.roots.length} roots)`);
    return;
  }

  if (cmd === "export") {
    // SCT-7: demo data for the server (/scout/log) and the web demo mode
    const agents = (rest.length ? rest : ["22771", "50283", "21548"]).map(BigInt);
    await exportDemo(plansDir, [join(repoRoot, "apps/server/src/data/scout-summary.json"), join(repoRoot, "apps/web/src/data/facts.json")], agents, log);
    return;
  }

  if (cmd === "balance") {
    const addr = new Wallet(process.env.PRIVATE_KEY!).address;
    log(`${addr} ${formatEther(await cc3Provider().getBalance(addr))} tCTC`);
    return;
  }

  console.log(`usage:
  scout   [--agents=22771,50283] [--maxTargets=2] [--minAge=500000] [--minDepth=2] [--k=3] [--c=5]
          [--gasBudget=9000000] [--scan=20] [--helpShare=0.6] [--gapProofs=conflicted|all|none] [--hireWei=0] [--maxPremiumBps=500] [--fundWei=0] [--live] [--log=file]
  verify  [agentId ...] [--minAge=500000] [--minDepth=2]
  record-one <chainKey> <txHash>
  export  [agentId ...]   (writes apps/server/src/data/scout-summary.json and apps/web/public/demo/facts.json)
  balance
plans are read from and written to ${plansDir}; dry-run unless --live.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

export { readdirSync };
