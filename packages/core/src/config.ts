import deployments from "./deployments.json" with { type: "json" };

/** Creditcoin CC3 Testnet: where the Tinjau contracts live. */
export const CC3_TESTNET = {
  chainId: 102031,
  rpc: "https://rpc.cc3-testnet.creditcoin.network",
  explorer: "https://creditcoin-testnet.blockscout.com",
  prover: "https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1",
} as const;

/** CC3 mainnet (docs.creditcoin.org/environments/mainnet, docs.attestcoin.org environments/mainnet,
 * read 11 Sep 2026). On CC3 mainnet, Ethereum mainnet is Attestcoin chainKey 1 (not 3). */
export const CC3_MAINNET = {
  chainId: 102030,
  rpc: "https://mainnet3.creditcoin.network",
  explorer: "https://creditcoin.blockscout.com",
  prover: "https://proofbuilder.cc3-mainnet-usc.creditcoin.network",
  ethereumChainKey: 1,
} as const;

export interface SourceChain {
  chainKey: number;
  name: string;
  evmChainId: number;
  /** Blockscout instance used for discovery (logs, tx lists). */
  blockscout: string;
  txUrl: (hash: string) => string;
  identityRegistry: string;
  reputationRegistry: string;
}

/** Attestcoin source chains as seen from CC3 **testnet**. */
export const SOURCES: Record<number, SourceChain> = {
  1: {
    chainKey: 1,
    name: "sepolia",
    evmChainId: 11155111,
    blockscout: "https://eth-sepolia.blockscout.com",
    txUrl: (h) => `https://sepolia.etherscan.io/tx/${h}`,
    identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  },
  3: {
    chainKey: 3,
    name: "ethereum",
    evmChainId: 1,
    blockscout: "https://eth.blockscout.com",
    txUrl: (h) => `https://etherscan.io/tx/${h}`,
    identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432",
    reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63",
  },
};

export function sourceOf(chainKey: number): SourceChain {
  const s = SOURCES[chainKey];
  if (!s) throw new Error(`unknown chainKey ${chainKey} (CC3 testnet knows 1 = Sepolia, 3 = Ethereum)`);
  return s;
}

/** Tinjau v3 deployment (written by scripts/deploy.sh). */
export const DEPLOYMENT = {
  network: deployments.network,
  chainId: deployments.chainId,
  deployer: deployments.deployer,
  facts: deployments.contracts.GroundedFacts.address,
  escrow: deployments.contracts.AgentHireEscrow.address,
  bounty: deployments.contracts.CoverageBounty.address,
  txs: {
    facts: deployments.contracts.GroundedFacts.tx,
    escrow: deployments.contracts.AgentHireEscrow.tx,
    bounty: deployments.contracts.CoverageBounty.tx,
  },
} as const;

export const cc3TxUrl = (hash: string) => `${CC3_TESTNET.explorer}/tx/${hash}`;
export const cc3AddressUrl = (addr: string) => `${CC3_TESTNET.explorer}/address/${addr}`;

/** Activity bucket size in source blocks, identical to GroundedFacts.BUCKET. */
export const BUCKET = 216_000n;
/** Reviewers examined per facts() call, identical to GroundedFacts.MAX_REVIEWERS. */
export const MAX_REVIEWERS = 256;

/** ERC-8004 event topics (keccak256 of the signatures). */
export const TOPICS = {
  NewFeedback: "0x6a4a61743519c9d648a14e6493f47dbe3ff1aa29e7785c96c8326a205e58febc",
  FeedbackRevoked: "0x25156fd3288212246d8b008d5921fde376c71ed14ac2e072a506eb06fde6d09d",
  Registered: "0xca52e62c367d81bb2e328eb795f7c7ba24afb478408a26c0e201d155c449bc4a",
  Transfer: "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef",
} as const;
