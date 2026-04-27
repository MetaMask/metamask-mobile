/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
const path = require('path');
const fs = require('fs');

/*
 * How this patch works?
 * 1. Match filename with node_modules/@noble/hashes/hmac.js (each library could have different version of @noble/hashes)
 * 2. If this's ESM version (@noble/hashes v2+), it removes export statement and adds a new patch to the end of the file
 * 3. If this's CJS version (@noble/hashes v1), it adds a new patch to the end of the file
 */

// Some @noble/hashes versions export sha512 from sha2.js while others use sha512.js.
// Resolve based on the local module directory to keep nested node_modules consistent.
const shaImportByDir = new Map();
function getShaModulePath(filename) {
  const dir = path.dirname(filename);
  if (shaImportByDir.has(dir)) {
    return shaImportByDir.get(dir);
  }
  const sha512Path = path.join(dir, 'sha512.js');
  const result = fs.existsSync(sha512Path) ? './sha512' : './sha2';
  shaImportByDir.set(dir, result);
  return result;
}

function buildCommonPatch(shaModulePath) {
  return [
    `const nobleHashesSha2 = require('${shaModulePath}');`,
    "const { hmacSha512 } = require('@metamask/native-utils');",
    'const originalHmac = hmac;',
    'const patchedHmac = (hash, key, message) => {',
    '  if (hash === nobleHashesSha2.sha512) {',
    '    try {',
    '      return hmacSha512(key, message);',
    '    } catch (error) {',
    "      console.error('Error in @metamask/native-utils.hmacSha512, falling back to original implementation', error);",
    '    }',
    '  }',
    '  return originalHmac(hash, key, message);',
    '};',
    'Object.assign(patchedHmac, originalHmac);',
  ].join('\n');
}
const cjsExportLine = 'exports.hmac = patchedHmac;';
const esmExportLine = 'export { patchedHmac as hmac };';

const nodeModulesSegment = `${path.sep}node_modules${path.sep}`;
const nobleHashesSegment = `${path.sep}@noble${path.sep}hashes${path.sep}hmac.js`;

function shouldPatch(filename) {
  if (!filename.endsWith('hmac.js')) {
    return false;
  }
  const normalized = path.normalize(filename);
  return (
    normalized.includes(nodeModulesSegment) &&
    normalized.includes(nobleHashesSegment)
  );
}

function patchNobleHashesHmac(src, filename) {
  if (!shouldPatch(filename)) {
    return src;
  }
  if (src.includes('export const hmac')) {
    const shaModulePath = getShaModulePath(filename);
    const esmPatch = `${buildCommonPatch(shaModulePath)}\n${esmExportLine}`;
    if (src.includes(esmPatch)) {
      return src;
    }
    const withoutExport = src.replace('export const hmac', 'const hmac');
    return `${withoutExport}\n${esmPatch}\n`;
  }
  if (src.includes('exports.hmac')) {
    const shaModulePath = getShaModulePath(filename);
    const cjsPatch = `${buildCommonPatch(shaModulePath)}\n${cjsExportLine}`;
    if (src.includes(cjsPatch)) {
      return src;
    }
    return `${src}\n${cjsPatch}\n`;
  }
  throw new Error(`Failed to patch @noble/hashes hmac in ${filename}`);
}

module.exports = { patchNobleHashesHmac };
