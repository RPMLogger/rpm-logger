#!/bin/sh
# Install this repo's git hooks. Run once after cloning (or on any machine you
# commit from) so the build-number stamper runs on every commit:
#
#   sh scripts/install-hooks.sh
#
set -e
ROOT="$(git rev-parse --show-toplevel)"
cp "$ROOT/scripts/pre-commit" "$ROOT/.git/hooks/pre-commit"
chmod +x "$ROOT/.git/hooks/pre-commit"
echo "✓ Installed pre-commit hook (build-number stamper)."
