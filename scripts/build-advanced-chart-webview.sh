#!/bin/bash
# ===========================================================================
# AdvancedChart WebView Asset Builder
# ===========================================================================
#
# Bundles app/components/UI/Charts/AdvancedChart/webview/src/ into a single
# IIFE and inlines it as a TypeScript string. The string is loaded by
# AdvancedChartTemplate.ts and injected into the WebView HTML at runtime
# (no CDN, no network requests for our code — required for App Store
# compliance).
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
#   - After any change under app/components/UI/Charts/AdvancedChart/webview/src/
#   - Commit the regenerated chartLogicString.ts alongside your source changes.
#   TODO: Add a CI step to enforce type checking (`tsc --noEmit`) and
#   bundle freshness (`yarn build:advanced-chart-webview && git diff --exit-code`).
#
# ===========================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBPACK_DIR="$REPO_ROOT/scripts/advanced-chart-webview"
WEBPACK_DIST="$WEBPACK_DIR/dist"
DEST_FILE="$REPO_ROOT/app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts"

echo "Building AdvancedChart WebView IIFE..."

# 1. Run webpack to produce the IIFE bundle.
mkdir -p "$WEBPACK_DIST"
"$REPO_ROOT/node_modules/.bin/webpack" --config "$WEBPACK_DIR/webpack.config.js"

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
// Source: app/components/UI/Charts/AdvancedChart/webview/src/

// prettier-ignore
const chartLogicString = \`${escape(bundle)}\`;
export default chartLogicString;
`;

fs.writeFileSync(destFile, content, 'utf8');
console.log(`Wrote ${destFile}`);
GENERATE_SCRIPT

echo "✅ Done. Commit app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts"
