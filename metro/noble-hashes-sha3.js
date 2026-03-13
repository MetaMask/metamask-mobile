/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
const path = require('path');

/*
 * How this patch works?
 * 1. Match filename with node_modules/@noble/hashes/sha3.js (each library could have different version of @noble/hashes)
 * 2. If this's ESM version (@noble/hashes v2+), it removes export statement and adds a new patch to the end of the file
 * 3. If this's CJS version (@noble/hashes v1), it adds a new patch to the end of the file
 */

function buildCommonPatch() {
  return [
    "const { keccak256 } = require('@metamask/native-utils');",
    'const originalKeccak256 = keccak_256;',
    'const patchedKeccak256 = (value) => {',
    '  try {',
    '    return keccak256(value);',
    '  } catch (error) {',
    "    console.error('Error in @metamask/native-utils.keccak256, falling back to original implementation', error);",
    '  }',
    '  return originalKeccak256(value);',
    '};',
    'Object.assign(patchedKeccak256, originalKeccak256);',
  ].join('\n');
}
const cjsExportLine = 'exports.keccak_256 = patchedKeccak256;';
const esmExportLine = 'export { patchedKeccak256 as keccak_256 };';

const nodeModulesSegment = `${path.sep}node_modules${path.sep}`;
const nobleHashesSegment = `${path.sep}@noble${path.sep}hashes${path.sep}sha3.js`;

function shouldPatch(filename) {
  if (!filename.endsWith('sha3.js')) {
    return false;
  }
  const normalized = path.normalize(filename);
  return (
    normalized.includes(nodeModulesSegment) &&
    normalized.includes(nobleHashesSegment)
  );
}

function patchNobleHashesSha3(src, filename) {
  if (!shouldPatch(filename)) {
    return src;
  }
  if (src.includes('export const keccak_256')) {
    const esmPatch = `${buildCommonPatch()}\n${esmExportLine}`;
    if (src.includes(esmPatch)) {
      return src;
    }
    const withoutExport = src.replace(
      'export const keccak_256',
      'const keccak_256',
    );
    return `${withoutExport}\n${esmPatch}\n`;
  }
  if (src.includes('exports.keccak_256')) {
    const cjsPatch = `${buildCommonPatch()}\n${cjsExportLine}`;
    if (src.includes(cjsPatch)) {
      return src;
    }
    return `${src}\n${cjsPatch}\n`;
  }
  throw new Error(`Failed to patch @noble/hashes sha3 in ${filename}`);
}

module.exports = { patchNobleHashesSha3 };
