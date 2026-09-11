import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FactsModel, ProverClient, decodeTxBytes, type ProofResponse } from "../src/index.js";

const fx = (name: string): ProofResponse =>
  JSON.parse(readFileSync(join(__dirname, "../../../contracts/test/fixtures", `${name}.json`), "utf8"));
const admit = (m: FactsModel, p: ProofResponse, attestors?: number) =>
  m.admit({ chainKey: p.chainKey, height: BigInt(p.headerNumber), txIndex: BigInt(p.txIndex), txBytes: p.txBytes, attestors });

// Same fixtures and expectations as contracts/test/GroundedFacts.t.sol (test_fixture_*).
describe("FactsModel mirrors GroundedFacts on real prover txBytes", () => {
  it("mainnet NewFeedback: pair, gap, attestors", () => {
    const m = new FactsModel();
    expect(admit(m, fx("mainnet-feedback"), 4)).toBe(true);
    expect(admit(m, fx("mainnet-feedback"), 4)).toBe(false);
    const client = "0x103040545AC5031A11E8C03dd11324C7333a13C7";
    const pair = m.pairOf(3, 50286n, client)!;
    expect(pair.maxIndex).toBe(24n);
    expect(pair.known).toBe(1n);
    const f = m.facts(3, 50286n, 0n, 0);
    expect(f.breadthRaw).toBe(1n);
    expect(f.gapCount).toBe(1n);
    expect(f.breadthGrounded).toBe(0n);
    expect(f.minAttestors).toBe(4);
  });

  it("old activity lowers seniority", () => {
    const m = new FactsModel();
    admit(m, fx("mainnet-feedback"));
    admit(m, fx("mainnet-activity-old"));
    expect(m.seniorityOf(3, "0x103040545AC5031A11E8C03dd11324C7333a13C7")!.oldest).toBe(23_779_699n);
  });

  it("mass registration: 10 agents, same tx, same owner and registrant", () => {
    const m = new FactsModel();
    admit(m, fx("mainnet-mass-registration"));
    const f = m.facts(3, 41885n, 0n, 0);
    expect(f.sameTxSiblings).toBe(9n);
    expect(f.cloneDensityLB).toBe(9n);
    expect(f.registrantSiblings).toBe(9n);
    expect(m.ownerOf(3, 41885n)).toBe("0xde152AfB7db5373F34876E1499fbD893A82dD336");
    expect(m.ownsAgents(3, "0xde152AfB7db5373F34876E1499fbD893A82dD336")).toBe(10n);
  });

  it("Sepolia feedback lives under chainKey 1 only", () => {
    const m = new FactsModel();
    admit(m, fx("sepolia-feedback"), 7);
    expect(m.pairOf(1, 9865n, "0x3f65A7CD469eeC1aFbA48083cC3D08910a20ed95")!.maxIndex).toBe(5n);
    expect(m.facts(3, 9865n, 0n, 0).breadthRaw).toBe(0n);
  });

  it("decodes tx sender and status", () => {
    const d = decodeTxBytes(fx("mainnet-mass-registration").txBytes);
    expect(d.from).toBe("0x99d4022C46DFd73f65Bc2a25F301158881394592");
    expect(d.status).toBe(1);
  });
});

describe.skipIf(!process.env.LIVE)("ProverClient against the live CC3 testnet prover", () => {
  const prover = new ProverClient({ retries: 1, retryDelayMs: 1000 });
  it("mainnet and Sepolia proofs, attested heights, errors", async () => {
    const main = await prover.proofByTx(3, "0xa0614d3461b674e1ab1e6cb28a35552ac3bf9b24367435a0fbbacf7c982e4305");
    expect(main.txIndex).toBe(300);
    const sep = await prover.proofByTx(1, "0x5ee427faa835e1064e60b281095b87fe58eb900cf42d39df79fe8e6e8e5cab07");
    expect(sep.headerNumber).toBe(11_592_186);
    expect(await prover.attestedHeight(3)).toBeGreaterThan(25_900_000);
    await expect(prover.proofByTx(3, "0x" + "0".repeat(63) + "1")).rejects.toMatchObject({ code: "TxHashNotFound", retriable: false });
  }, 60_000);
});
