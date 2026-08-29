#!/bin/zsh
# Full live sequence on CC3 Testnet: deploy → verify → record → bounty → scout full cycle → hire/release.
set -e
cd "$(dirname "$0")/.."
set -a; source .env; set +a
R=https://rpc.cc3-testnet.creditcoin.network
log(){ echo "[$(date +%H:%M:%S)] $*"; }
log "deploy GroundedFacts"; F=$(forge create --rpc-url cc3 --private-key "$PRIVATE_KEY" --broadcast src/GroundedFacts.sol:GroundedFacts | grep "Deployed to" | awk '{print $NF}')
log "deploy AgentHireEscrow"; E=$(forge create --rpc-url cc3 --private-key "$PRIVATE_KEY" --broadcast src/AgentHireEscrow.sol:AgentHireEscrow --constructor-args $F | grep "Deployed to" | awk '{print $NF}')
log "deploy CoverageBounty"; B=$(forge create --rpc-url cc3 --private-key "$PRIVATE_KEY" --broadcast src/CoverageBounty.sol:CoverageBounty --constructor-args $F | grep "Deployed to" | awk '{print $NF}')
log "FACTS=$F ESCROW=$E BOUNTY=$B"
sed -i '' "s/^FACTS=.*/FACTS=$F/; s/^ESCROW=.*/ESCROW=$E/; s/^BOUNTY=.*/BOUNTY=$B/" .env
printf "VITE_CC3_RPC=%s\nVITE_FACTS=%s\nVITE_ESCROW=%s\n" "$R" "$F" "$E" > web/.env.local
ARGS=$(cast abi-encode 'constructor(address)' $F)
log "verify GroundedFacts"; forge verify-contract --rpc-url cc3 --verifier blockscout --verifier-url https://creditcoin-testnet.blockscout.com/api/ "$F" src/GroundedFacts.sol:GroundedFacts --watch 2>&1 | grep -iE "verified|already|error" | head -1 || true
log "verify AgentHireEscrow"; forge verify-contract --rpc-url cc3 --verifier blockscout --verifier-url https://creditcoin-testnet.blockscout.com/api/ --constructor-args "$ARGS" "$E" src/AgentHireEscrow.sol:AgentHireEscrow --watch 2>&1 | grep -iE "verified|already|error" | head -1 || true
log "verify CoverageBounty"; forge verify-contract --rpc-url cc3 --verifier blockscout --verifier-url https://creditcoin-testnet.blockscout.com/api/ --constructor-args "$ARGS" "$B" src/CoverageBounty.sol:CoverageBounty --watch 2>&1 | grep -iE "verified|already|error" | head -1 || true
export FACTS=$F ESCROW=$E BOUNTY=$B
cd agent
log "scout 22771"; node_modules/.bin/tsx src/scout.ts --facts=$F --agents=22771 --maxTargets=1 --minAge=500000 --minDepth=2 --k=3 --c=5 --gasBudget=9000000 2>&1 | grep -E "^\[R|^\[tx\]|^\[plan\]|^   \+" > plans/live-22771.log || true
log "scout 50283"; node_modules/.bin/tsx src/scout.ts --facts=$F --agents=50283 --maxTargets=1 --minAge=500000 --minDepth=2 --k=3 --c=5 --gasBudget=9000000 2>&1 | grep -E "^\[R|^\[tx\]|^\[plan\]|^   \+" > plans/live-50283.log || true
log "record Sepolia"; node_modules/.bin/tsx src/record-one.ts 1 0x5ee427faa835e1064e60b281095b87fe58eb900cf42d39df79fe8e6e8e5cab07 2>&1 | tail -3 > plans/live-sepolia.log || true
log "record mass-registration"; node_modules/.bin/tsx src/record-one.ts 3 0x6c89bc776674e98a1b773aadcd22ba09c0de333e84a29994ead20c163a1a23c6 2>&1 | tail -3 > plans/live-mass.log || true
cd ..
log "fund bounty 21548"; cast send --rpc-url cc3 --private-key "$PRIVATE_KEY" --value 0.05ether $B "fund(uint64,uint256,uint64,uint32,uint64,uint64,uint64)" 3 21548 500000 2 3 5 $(( $(date +%s) + 7*86400 )) >/dev/null
cd agent
log "scout full cycle"; node_modules/.bin/tsx src/scout.ts --facts=$F --bounty=$B --escrow=$E --maxTargets=2 --minAge=500000 --minDepth=2 --k=3 --c=5 --gasBudget=9000000 --hireWei=10000000000000000 2>&1 | grep -E "^\[R|^\[tx\]|^\[plan\]|^   \+|already admitted" > plans/live-full-cycle.log || true
cd ..
P="(500000,2,3,5,100,2000)"; D=$(( $(date +%s) + 86400 ))
log "hire 22771"; cast send --rpc-url cc3 --private-key "$PRIVATE_KEY" --value 0.01ether $E "hire(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16),uint64)" 3 22771 "$P" $D >/dev/null
log "hire 50283 (expect Gated)"; (cast send --rpc-url cc3 --private-key "$PRIVATE_KEY" --value 0.01ether $E "hire(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16),uint64)" 3 50283 "$P" $D 2>&1 | grep -oE 'data: "0x[0-9a-f]{8}' | head -1) || true
JOBS=$(cast call --rpc-url cc3 $E "jobCount()(uint256)"); log "jobs=$JOBS"
log "release job $((JOBS-1))"; cast send --rpc-url cc3 --private-key "$PRIVATE_KEY" $E "release(uint256)" $((JOBS-1)) >/dev/null
SIG='facts(uint64,uint256,uint64,uint32)((uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,bool))'
QS='quote(uint64,uint256,(uint64,uint32,uint64,uint64,uint16,uint16))(uint256,uint16,uint64,(uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,uint64,bool))'
for a in 22771 50283 21548; do log "facts $a: $(cast call --rpc-url cc3 $F "$SIG" 3 $a 500000 2)"; done
log "quote 22771: $(cast call --rpc-url cc3 $E "$QS" 3 22771 "$P" | head -3 | tr '\n' ' ')"
log "quote 50283: $(cast call --rpc-url cc3 $E "$QS" 3 50283 "$P" | head -3 | tr '\n' ' ')"
log "DONE"
