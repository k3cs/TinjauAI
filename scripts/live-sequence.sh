#!/usr/bin/env bash
# Live demo sequence on CC3 Testnet against the v3 contracts (DEP-4, DEP-5, DEP-7).
# 1. fund a bounty on agent 21548   2. scout cycle 1 (claims the bounty, proves 22771/50283, hires)
# 3. extra proofs (Sepolia review, mass registration)   4. hire 50283 must revert Gated
# 5. release the scout's hire   6. scout cycle 2 (everything already admitted: 0 gas)   7. verify
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
set -a; source .env; set +a
RPC=${CC3_RPC:-https://rpc.cc3-testnet.creditcoin.network}
LOG=live-$(date +%Y%m%d-%H%M).log
S() { (cd services/scout && pnpm -s scout "$@" --log="$LOG"); }
say() { echo "[$(date +%H:%M:%S)] $*" | tee -a "services/scout/plans/$LOG"; }
mkdir -p services/scout/plans

say "fund bounty on agent 21548 (0.05 tCTC, 7 days, thresholds 500000/2/3/5)"
EXP=$(( $(date +%s) + 7*86400 ))
cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" --value 0.05ether "$BOUNTY" \
  "fund(uint64,uint256,uint64,uint32,uint64,uint64,uint64)" 3 21548 500000 2 3 5 $EXP --json \
  | python3 -c "import json,sys;r=json.load(sys.stdin);print('[tx] fund',r['transactionHash'],'block',int(r['blockNumber'],16),'gas',int(r['gasUsed'],16))" | tee -a "services/scout/plans/$LOG"

say "scout cycle 1: bounty first, then 22771 and 50283; hire when facts pass (0.01 tCTC)"
S scout --agents=22771,50283 --maxTargets=3 --hireWei=10000000000000000 --live

say "extra proofs: Sepolia NewFeedback (chainKey 1) and the mainnet mass-registration tx"
S record-one 1 0x5ee427faa835e1064e60b281095b87fe58eb900cf42d39df79fe8e6e8e5cab07
S record-one 3 0x6c89bc776674e98a1b773aadcd22ba09c0de333e84a29994ead20c163a1a23c6

say "hire 50283 must revert (Gated)"
P="(500000,2,3,5,100,2000,0,0)"; D=$(( $(date +%s) + 86400 ))
cast call --rpc-url "$RPC" --from "$DEPLOYER" --value 0.01ether "$ESCROW" \
  "hire(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16,uint32,uint64),uint64)" 3 50283 "$P" $D 2>&1 | tail -1 | tee -a "services/scout/plans/$LOG" || true

say "release the latest job"
J=$(cast call --rpc-url "$RPC" "$ESCROW" "jobCount()(uint256)"); J=$((J-1))
cast send --rpc-url "$RPC" --private-key "$PRIVATE_KEY" "$ESCROW" "release(uint256)" $J --json \
  | python3 -c "import json,sys;r=json.load(sys.stdin);print('[tx] release job','$J',r['transactionHash'],'block',int(r['blockNumber'],16),'gas',int(r['gasUsed'],16))" | tee -a "services/scout/plans/$LOG"

say "scout cycle 2 on 50283: everything already admitted"
S scout --agents=50283 --maxTargets=1 --live

say "verify: off-chain recompute vs facts() on-chain"
S verify 22771 50283 21548 || true
say "done"
