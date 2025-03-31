#!/usr/bin/env bash
cd "$(dirname "$0")/.." || exit 1
set -euo pipefail

project_dir=$(pwd)

dir_path=api/mdn-browser-compat-data
repository=https://github.com/mdn/browser-compat-data.git
echo "Fetching MDN Browser Compat Data..."

rm -rf "$dir_path"
git clone -q --no-checkout --depth 1 --filter=blob:none "$repository" "$dir_path"
cd "$dir_path" || exit 1
git sparse-checkout init --cone
echo "/html/" > .git/info/sparse-checkout
git checkout -q
rm -rf ".git"
# Delete everything except the HTML directory
find . -mindepth 1 -maxdepth 1 ! -name "html" -exec rm -rf {} +

# Return to project root
cd "$project_dir" || exit 1
