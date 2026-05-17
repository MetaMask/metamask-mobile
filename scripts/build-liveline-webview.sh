#!/bin/bash
# ===========================================================================
# Liveline WebView Asset Builder
# ===========================================================================
#
# Bundles liveline + its React peer deps into self-contained JS strings that
# are embedded directly in the LivelineChart WebView HTML (no CDN, no network
# requests at runtime — required for App Store compliance).
#
# What it produces
# ----------------
#   app/components/UI/Charts/LivelineChart/LivelineChartAssets.ts
#
# This file exports three string constants:
#   REACT_LIB       — react UMD production build  (~11 KB)
#   REACT_DOM_LIB   — react-dom UMD production build  (~129 KB)
#   LIVELINE_LIB    — liveline IIFE bundle, React externalized  (~40 KB)
#
# The LivelineChartTemplate inlines all three as <script> blocks so the
# WebView never makes any external network requests.
#
# Usage
# -----
#   yarn build:liveline-webview
#
# When to re-run
# --------------
#   - After bumping the liveline devDependency version
#   - After bumping the react / react-dom versions
#   Commit the updated LivelineChartAssets.ts along with the version bump.
#
# ===========================================================================

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEBPACK_DIR="$REPO_ROOT/scripts/liveline-webview"
WEBPACK_DIST="$WEBPACK_DIR/dist"
DEST="$REPO_ROOT/app/components/UI/Charts/LivelineChart"

echo "Building liveline WebView assets..."

# 1. Run webpack to produce the IIFE bundle
mkdir -p "$WEBPACK_DIST"
"$REPO_ROOT/node_modules/.bin/webpack" --config "$WEBPACK_DIR/webpack.config.js"

# 2. Generate LivelineChartAssets.ts from the three JS files
REPO_ROOT="$REPO_ROOT" WEBPACK_DIST="$WEBPACK_DIST" DEST="$DEST" node - <<'GENERATE_SCRIPT'
const fs   = require('fs');
const path = require('path');

const repoRoot    = process.env.REPO_ROOT;
const webpackDist = process.env.WEBPACK_DIST;
const dest        = process.env.DEST;

const reactLib    = fs.readFileSync(
  path.join(repoRoot, 'node_modules/react/umd/react.production.min.js'), 'utf8');
const reactDomLib = fs.readFileSync(
  path.join(repoRoot, 'node_modules/react-dom/umd/react-dom.production.min.js'), 'utf8');
const livelineLib = fs.readFileSync(
  path.join(webpackDist, 'liveline.iife.js'), 'utf8');

const livelineVersion = require(path.join(repoRoot, 'node_modules/liveline/package.json')).version;
const reactVersion    = require(path.join(repoRoot, 'node_modules/react/package.json')).version;

// Escape backticks and ${} so the strings are safe inside template literals.
const escape = (s) => s.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');

const content = `// AUTO-GENERATED — do not edit manually.
// Re-generate with: yarn build:liveline-webview
//
// liveline@${livelineVersion} + react@${reactVersion}
//
// Contents:
//   REACT_LIB       react UMD production build
//   REACT_DOM_LIB   react-dom UMD production build
//   LIVELINE_LIB    liveline IIFE bundle (React externalized)

/* eslint-disable */
// prettier-ignore
export const REACT_LIB = \`${escape(reactLib)}\`;
// prettier-ignore
export const REACT_DOM_LIB = \`${escape(reactDomLib)}\`;
// prettier-ignore
export const LIVELINE_LIB = \`${escape(livelineLib)}\`;
`;

fs.writeFileSync(path.join(dest, 'LivelineChartAssets.ts'), content, 'utf8');
console.log('LivelineChartAssets.ts written.');
GENERATE_SCRIPT

echo "✅ Done. Commit app/components/UI/Charts/LivelineChart/LivelineChartAssets.ts"
