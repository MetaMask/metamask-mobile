#!/usr/bin/env node
/* eslint-disable import/no-commonjs, import/no-nodejs-modules, no-console */
/**
 * Sync script that reads chartLogic.js and exports it as a string in chartLogicString.ts
 *
 * Run this after editing chartLogic.js:
 *   node app/components/UI/Charts/AdvancedChart/webview/syncChartLogic.js
 */

const fs = require('fs');
const path = require('path');

const sourceFile = path.join(__dirname, 'chartLogic.js');
const targetFile = path.join(__dirname, 'chartLogicString.ts');

const jsContent = fs.readFileSync(sourceFile, 'utf8');

const tsContent = `/**
 * AUTO-GENERATED - DO NOT EDIT DIRECTLY
 *
 * This file is generated from chartLogic.js by syncChartLogic.js
 * Edit chartLogic.js instead, then run:
 *   node app/components/UI/Charts/AdvancedChart/webview/syncChartLogic.js
 */

// eslint-disable-next-line import/no-default-export
export default \`${jsContent.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`;
`;

fs.writeFileSync(targetFile, tsContent);
console.log('✓ Synced chartLogic.js → chartLogicString.ts');
