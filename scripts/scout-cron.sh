#!/usr/bin/env bash
# SCT-8: one unattended scout cycle (bounties first, then the most-reviewed agents of the last 7 days),
# capped by gas, appending to services/scout/plans/cron.log. Runs locally on Dien's machine: the scout
# holds the deployer key, so it is never hosted.
#
# Install (hourly):
#   crontab -e  →  0 * * * * "/path/to/Tinjau/scripts/scout-cron.sh"
#
# The cycle is a no-op once DEADLINE passes, so the entry can be left in place and removed later.
set -euo pipefail

# cron runs with a minimal PATH: point at the tools explicitly.
export PATH="/opt/homebrew/bin:/Users/scientivan/.nvm/versions/node/v24.10.0/bin:/usr/bin:/bin:/usr/sbin:/sbin"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/services/scout"
mkdir -p plans
LOG="plans/cron.log"

# BUIDL CTC 2026 Fall submission deadline: 14 Sep 2026 10:59 WIB = 03:59 UTC.
DEADLINE="${DEADLINE:-2026-09-14T03:59:00Z}"
now=$(date -u +%s)
until=$(date -u -j -f "%Y-%m-%dT%H:%M:%SZ" "$DEADLINE" +%s)
if [ "$now" -ge "$until" ]; then
  echo "=== $(date -u +%FT%TZ) past deadline ($DEADLINE), skipping" >> "$LOG"
  exit 0
fi

echo "=== $(date -u +%FT%TZ) cycle start" >> "$LOG"

# Stop spending if the deployer is nearly out of tCTC: a failed cycle costs gas and proves nothing.
balance=$(pnpm -s scout balance 2>/dev/null | awk '{print $2}' || echo 0)
if [ "$(printf '%.0f' "${balance:-0}")" -lt 5 ]; then
  echo "balance ${balance:-unknown} tCTC below 5, skipping (top up via the Creditcoin faucet)" >> "$LOG"
  exit 0
fi
echo "balance ${balance} tCTC" >> "$LOG"

# --maxTargets=8 per hourly cycle (raised from 2 every 3 h on 12 Sep: one cycle costs ~0.003 tCTC
# against a 9,999 tCTC balance); --hireWei=0 means the scout proves and claims bounties but does not
# spend on hires unattended.
if pnpm -s scout scout --maxTargets=8 --gasBudget=24000000 --hireWei=0 --live --log=cron.log >/dev/null 2>&1; then
  echo "cycle ok" >> "$LOG"
else
  echo "cycle failed (exit $?)" >> "$LOG"
fi
