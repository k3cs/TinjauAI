export type Facts = { breadthRaw: number; breadthGrounded: number; breadthIndependent: number; gapCount: number; negatives: number; cloneDensityLB: number; registrantSiblings: number; uriSiblings: number; sameTxSiblings: number; firstRegisteredHeight: string };
export type Reviewer = { client: string; firstFeedbackHeight: string; oldestHeight: string | null; ageBlocks: string; depth: number; maxIndex: string; proven: number; negatives: number; ownsAgents: number };
export type ProofRow = { kind: string; direction: "helps" | "hurts" | "neutral"; txHash: string; height: string | number; txIndex?: number; roots: number; from: string; note: string };
export type Decision = { kind: string; direction: string; txHash: string; height: string; note: string; estGas: number };
export type AgentDemo = { agentId: string; thresholds: { minAge: string; minDepth: number; k: number; c: number }; owner: string; registrant: string; uriHash: string; facts: Facts; reviewers: Reviewer[]; proofs: ProofRow[]; decisions: { chosen: Decision[]; rejected: { c: Decision; why: string }[] }; source: { plan: string; generatedAt: string; mode: "demo" | "live" } };
export type Thresholds = { minAge: number; minDepth: number; k: number; c: number };
export type Quote = { riskBps: number; premiumBps: number; gated: boolean };
