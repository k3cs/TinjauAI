#!/usr/bin/env bash
# SCT-8: one unattended scout cycle (bounties first, then the most-reviewed agents of the last 7 days),
# capped by gas, appending to services/scout/plans/cron.log. Meant for a local launchd/cron entry on
# Dien's machine (the scout holds the deployer key, so it is never hosted). NOT installed by default:
#   crontab -e  →  0 */3 * * * /path/to/Tinjau/scripts/scout-cron.sh
set -euo pipefail
cd "$(cd "$(dirname "$0")/.." && pwd)/services/scout"
echo "=== $(date -u +%FT%TZ)" >> plans/cron.log
pnpm -s scout scout --maxTargets=2 --gasBudget=6000000 --hireWei=0 --live --log=cron.log >/dev/null 2>&1 || echo "cycle failed" >> plans/cron.log
