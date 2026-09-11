import { describe, expect, it } from "vitest";
import { ProverClient } from "@tinjau/core";
import { checkClaim } from "../src/claims.js";

// Deterministic half of the claim reader: whatever the LLM proposes, only these checks decide.
const REAL = "0xa0614d3461b674e1ab1e6cb28a35552ac3bf9b24367435a0fbbacf7c982e4305"; // NewFeedback on Ethereum mainnet
const doc = JSON.stringify({ proof_of_payment: { network: "ethereum", payment_tx: REAL }, other: { network: "base", tx: "0x" + "ab".repeat(32) } });
const prover = new ProverClient({ retries: 1, retryDelayMs: 1000 });

describe.skipIf(!process.env.LIVE)("claim checks against the live prover and precompile", () => {
  it("proven on the claimed chain", async () => {
    const r = await checkClaim(prover, doc, { network: "ethereum", txHash: REAL, quote: "payment_tx" });
    expect(r.verdict).toBe("proven");
  }, 60_000);
  it("same hash claimed on Sepolia is not there", async () => {
    const r = await checkClaim(prover, doc + REAL, { network: "sepolia", txHash: REAL, quote: "" });
    expect(r.verdict).toBe("not-on-claimed-chain");
  }, 60_000);
  it("Base cannot be checked through Attestcoin", async () => {
    const r = await checkClaim(prover, doc, { network: "base", txHash: "0x" + "ab".repeat(32), quote: "" });
    expect(r.verdict).toBe("unsupported-chain");
  });
  it("a hash the model invented is discarded before any lookup", async () => {
    const r = await checkClaim(prover, doc, { network: "ethereum", txHash: "0x" + "cd".repeat(32), quote: "" });
    expect(r.verdict).toBe("hash-not-in-document");
  });
});
