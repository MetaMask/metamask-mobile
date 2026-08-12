#!/bin/bash
# ===========================================================================
# AdvancedChart WebView Asset Builder
# ===========================================================================
#
# Bundles the shared, platform-agnostic engine package
# `@metamask/advanced-chart-core` into a single IIFE and inlines it as a
# TypeScript string. The string is loaded by AdvancedChartTemplate.ts and
# injected into the WebView HTML at runtime (no CDN, no network requests for
# our code — required for App Store compliance).
#
# The engine source no longer lives in this repo; it lives in the core
# monorepo and is consumed here via the npm alias declared in package.json
# (`@metamask/advanced-chart-core`). The bundle is built from the installed
# package under node_modules using webpack.config.core.js.
#
# What it produces
# ----------------
#   app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts
#
#   Exports a single default string constant: chartLogicString.
#
# Usage
# -----
#   yarn build:advanced-chart-webview
#
# When to re-run
# --------------
#   - After bumping the `@metamask/advanced-chart-core` package version.
#   - Commit the regenerated chartLogicString.ts alongside the version bump.
#   TODO: Add a CI step to enforce bundle freshness
#   (`yarn build:advanced-chart-webview && git diff --exit-code`).
#
# ===========================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBPACK_DIR="$REPO_ROOT/scripts/advanced-chart-webview"
WEBPACK_DIST="$WEBPACK_DIR/dist-core"
DEST_FILE="$REPO_ROOT/app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts"

echo "Building AdvancedChart WebView IIFE from @metamask/advanced-chart-core..."

# 1. Run webpack to produce the IIFE bundle from the shared core package.
mkdir -p "$WEBPACK_DIST"
"$REPO_ROOT/node_modules/.bin/webpack" --config "$WEBPACK_DIR/webpack.config.core.js"

# 2. Inline the IIFE as a TypeScript string.
WEBPACK_DIST="$WEBPACK_DIST" DEST_FILE="$DEST_FILE" node - <<'GENERATE_SCRIPT'
const fs = require('fs');
const path = require('path');

const webpackDist = process.env.WEBPACK_DIST;
const destFile = process.env.DEST_FILE;

const bundle = fs.readFileSync(
  path.join(webpackDist, 'chartLogic.iife.js'),
  'utf8',
);

// Escape backslashes, backticks, and ${ for safe template-literal embedding.
const escape = (s) =>
  s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const content = `// AUTO-GENERATED — do not edit manually.
// Re-generate with: yarn build:advanced-chart-webview
//
// Source: @metamask/advanced-chart-core (npm package)

// prettier-ignore
const chartLogicString = \`${escape(bundle)}\`;
export default chartLogicString;
`;

fs.writeFileSync(destFile, content, 'utf8');
console.log(`Wrote ${destFile}`);
GENERATE_SCRIPT

echo "✅ Done. Commit app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts"
