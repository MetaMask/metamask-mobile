#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read the lightweight-charts library file
const libraryPath = path.join(__dirname, '../app/lib/lightweight-charts/index.js');
console.log('Reading library from:', libraryPath);

const libraryContent = fs.readFileSync(libraryPath, 'utf8');

// Create the TypeScript module with the library as a string constant
const moduleContent = `// Auto-generated - DO NOT EDIT MANUALLY
// Generated from: app/lib/lightweight-charts/index.js

/**
 * Lightweight Charts Library v5.0.8
 * Bundled for local use in WebView
 */
export const LIGHTWEIGHT_CHARTS_LIBRARY = ${JSON.stringify(libraryContent)};
`;

// Write the generated module
const outputPath = path.join(__dirname, '../app/lib/lightweight-charts/LightweightChartsLib.ts');
fs.writeFileSync(outputPath, moduleContent, 'utf8');

console.log('✅ Generated LightweightChartsLib.ts successfully!');
console.log(`📦 Library size: ${Math.round(libraryContent.length / 1024)} KB`);