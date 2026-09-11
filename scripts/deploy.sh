#!/usr/bin/env bash
# Deploy GroundedFacts, AgentHireEscrow, CoverageBounty to Creditcoin CC3 Testnet and verify them
# on Blockscout. Uses `forge create --broadcast` because forge's script simulation rejects
# Creditcoin block headers (prevrandao). Writes addresses to .env (FACTS/ESCROW/BOUNTY) and to
# packages/core/src/deployments.json.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a; source .env; set +a
RPC=${CC3_RPC:-https://rpc.cc3-testnet.creditcoin.network}
VERIFIER_URL=https://creditcoin-testnet.blockscout.com/api/
# ERC-8004 registries per Attestcoin chainKey on CC3 testnet: 1 = Sepolia, 3 = Ethereum mainnet
REGS="[(1,0x8004A818BFB912233c491871b3d84c89A494BD9e,0x8004B663056A597Dffe9eCcC1965A193B7388713),(3,0x8004A169FB4a3325136EB29fA0ceB6D2e539a432,0x8004BAa17C55a88189AE136b182e5fdA19dE9b63)]"

cd contracts
deploy() { forge create --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --broadcast "$@" 2>&1 | tee /dev/stderr | awk '/Deployed to:/{a=$3} /Transaction hash:/{t=$3} END{print a" "t}'; }
read F FTX < <(deploy src/GroundedFacts.sol:GroundedFacts --constructor-args "$REGS")
read E ETX < <(deploy src/AgentHireEscrow.sol:AgentHireEscrow --constructor-args "$F")
read B BTX < <(deploy src/CoverageBounty.sol:CoverageBounty --constructor-args "$F")
echo "FACTS=$F ($FTX)"; echo "ESCROW=$E ($ETX)"; echo "BOUNTY=$B ($BTX)"

cd "$ROOT"
for k in FACTS ESCROW BOUNTY; do sed -i '' "/^$k=/d" .env; done
printf "FACTS=%s\nESCROW=%s\nBOUNTY=%s\n" "$F" "$E" "$B" >> .env
mkdir -p packages/core/src
cat > packages/core/src/deployments.json <<JSON
{
  "network": "creditcoin-cc3-testnet",
  "chainId": 102031,
  "deployedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "deployer": "$(cast wallet address --private-key "$PRIVATE_KEY")",
  "contracts": {
    "GroundedFacts": { "address": "$F", "tx": "$FTX" },
    "AgentHireEscrow": { "address": "$E", "tx": "$ETX" },
    "CoverageBounty": { "address": "$B", "tx": "$BTX" }
  }
}
JSON

cd contracts
ENC_REGS=$(cast abi-encode "c((uint64,address,address)[])" "$REGS")
ENC_F=$(cast abi-encode "c(address)" "$F")
forge verify-contract --rpc-url "$RPC" --verifier blockscout --verifier-url "$VERIFIER_URL" --constructor-args "$ENC_REGS" --watch "$F" src/GroundedFacts.sol:GroundedFacts || true
forge verify-contract --rpc-url "$RPC" --verifier blockscout --verifier-url "$VERIFIER_URL" --constructor-args "$ENC_F" --watch "$E" src/AgentHireEscrow.sol:AgentHireEscrow || true
forge verify-contract --rpc-url "$RPC" --verifier blockscout --verifier-url "$VERIFIER_URL" --constructor-args "$ENC_F" --watch "$B" src/CoverageBounty.sol:CoverageBounty || true
