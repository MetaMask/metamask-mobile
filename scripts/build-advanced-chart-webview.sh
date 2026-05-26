#!/bin/bash
# ===========================================================================
# AdvancedChart WebView Bundle Builder
# ===========================================================================
#
# Bundles the TypeScript modules in webview/src/ into a single IIFE JS string
# that is embedded directly in the AdvancedChart WebView HTML template.
#
# What it produces
# ----------------
#   app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts
#
# This file exports a default string constant containing the bundled JS.
# AdvancedChartTemplate.ts inlines it as a <script> block.
#
# Usage
# -----
#   yarn build:advanced-chart-webview
#
# When to re-run
# --------------
#   - After editing any file in webview/src/
#   Commit the updated chartLogicString.ts along with the source changes.
#
# ===========================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBPACK_DIR="$REPO_ROOT/scripts/advanced-chart-webview"
WEBPACK_DIST="$WEBPACK_DIR/dist"
DEST="$REPO_ROOT/app/components/UI/Charts/AdvancedChart/webview"

echo "Building AdvancedChart WebView bundle..."

# 1. Run webpack to produce the IIFE bundle
mkdir -p "$WEBPACK_DIST"
"$REPO_ROOT/node_modules/.bin/webpack" --config "$WEBPACK_DIR/webpack.config.js"

# 2. Generate chartLogicString.ts from the bundled JS
REPO_ROOT="$REPO_ROOT" WEBPACK_DIST="$WEBPACK_DIST" DEST="$DEST" node - <<'GENERATE_SCRIPT'
const fs = require('fs');
const path = require('path');

const webpackDist = process.env.WEBPACK_DIST;
const dest = process.env.DEST;

const bundleJs = fs.readFileSync(
  path.join(webpackDist, 'chartLogic.iife.js'), 'utf8');

// Escape backticks and ${} so the string is safe inside a template literal.
const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const content = `/**
 * AUTO-GENERATED — do not edit manually.
 * Re-generate with: yarn build:advanced-chart-webview
 *
 * Source: webview/src/*.ts → webpack IIFE bundle
 */

/* eslint-disable */
// eslint-disable-next-line import-x/no-default-export
// prettier-ignore
export default \`${escape(bundleJs)}\`;
`;

fs.writeFileSync(path.join(dest, 'chartLogicString.ts'), content, 'utf8');
console.log('chartLogicString.ts written.');
GENERATE_SCRIPT

echo "✅ Done. Commit app/components/UI/Charts/AdvancedChart/webview/chartLogicString.ts"
