#!/usr/bin/env bash
# Fetch a real Attestcoin proof from the CC3 testnet prover API and store it as
# contracts/test/fixtures/<name>.json (raw API response) and <name>.hex (ABI-encoded
# GroundedFacts.Proof tuple, for Foundry tests).
# Usage: scripts/fetch-fixture.sh <chainKey> <txHash> <name>
set -euo pipefail
CK=$1; TX=$2; NAME=$3
API=${PROVER_API:-https://proof-gen-api.cc3-testnet.creditcoin.network/api/v1}
DIR="$(cd "$(dirname "$0")/.." && pwd)/contracts/test/fixtures"
mkdir -p "$DIR"
curl -sf "$API/proof-by-tx/$CK/$TX" -o "$DIR/$NAME.json"
TUPLE=$(python3 - "$DIR/$NAME.json" <<'PY'
import json, sys
d = json.load(open(sys.argv[1]))
sib = ",".join("(%s,%s)" % (s["hash"], "true" if s["isLeft"] else "false") for s in d["merkleProof"]["siblings"])
roots = ",".join(d["continuityProof"]["roots"])
print("(%d,%d,%s,(%s,[%s]),(%s,[%s]))" % (d["chainKey"], d["headerNumber"], d["txBytes"],
      d["merkleProof"]["root"], sib, d["continuityProof"]["lowerEndpointDigest"], roots))
PY
)
cast abi-encode "f((uint64,uint64,bytes,(bytes32,(bytes32,bool)[]),(bytes32,bytes32[])))" "$TUPLE" | tr -d "\n" > "$DIR/$NAME.hex"
python3 -c "import json;d=json.load(open('$DIR/$NAME.json'));print('$NAME', 'height', d['headerNumber'], 'txIndex', d['txIndex'], 'roots', len(d['continuityProof']['roots']), 'txBytes', len(d['txBytes'])//2-1, 'B')"
