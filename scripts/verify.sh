#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
if command -v node >/dev/null; then node --check src/mobile.js; fi
for file in Containerfile compose.yaml src/mobile.js src/mobile-index.html scripts/10-desktop-init scripts/launch-app; do test -s "$file"; done
sh -n scripts/10-desktop-init scripts/launch-app scripts/run-podman.sh
grep -q snapmaker-mobile.js src/mobile-index.html
grep -q "/usr/share/selkies/web/index.html:ro" compose.yaml
grep -q "/usr/share/selkies/web/snapmaker-mobile.js:ro" compose.yaml
if grep -E -n '100[.]89[.]|192[.]168[.]|/home/thn|noty[.]se|ghp_[[:alnum:]_]+|PRIVATE KEY-----' Containerfile compose.yaml src/* scripts/launch-app scripts/10-desktop-init scripts/run-podman.sh desktop/* README.md SECURITY.md docs/*; then
 echo "Private artifact reference found" >&2; exit 1
fi
echo "STATIC_CHECK_PASS"
