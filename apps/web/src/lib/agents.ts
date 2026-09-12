/**
 * The agents shown on the page are real entries in the public ERC-8004 registry on Ethereum mainnet.
 * Tinjau does not name, rank or rebrand them: the id is the registry's id, the owner is the owner it
 * proved, and the one-line note says only how the agent entered our view. Inventing friendly names
 * for real on-chain identities would be fabricating provenance, which is the exact thing this product
 * exists to catch.
 */
export interface RosterEntry {
  agentId: bigint;
  /** How this agent came into the bureau's view. Factual, no adjectives. */
  origin: string;
}

export const ROSTER: RosterEntry[] = [
  { agentId: 22771n, origin: "Picked by the scout as one of the most reviewed agents of the week." },
  { agentId: 21548n, origin: "Nobody had proven its reviews yet. The scout claimed an open bounty to do it." },
  { agentId: 50283n, origin: "Registered in a batch by an owner who runs several agents." },
  { agentId: 50286n, origin: "Found by the unattended scout cycle on 12 September." },
];
