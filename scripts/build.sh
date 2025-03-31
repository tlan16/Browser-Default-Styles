#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
set -euo pipefail

./scripts/fetch-md-browser-compact-data.sh
npx --yes tsx scripts/generator.ts
