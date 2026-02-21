/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
const path = require('path');

/*
 * How this patch works?
 * 1. Match filename with node_modules/@noble/curves/secp256k1.js (each library could have different version of @noble/curves)
 * 2. If this's ESM version (@noble/curves v2+), it removes export statement and adds a new patch to the end of the file
 * 3. If this's CJS version (@noble/curves v1), it adds a new patch to the end of the file
 */

const cjsPatch =
  "exports.secp256k1 = Object.freeze({ ...exports.secp256k1, getPublicKey: require('@metamask/native-utils').getPublicKey });";
const esmPatch =
  "const patchedSecp256k1 = Object.freeze({ ...secp256k1, getPublicKey: require('@metamask/native-utils').getPublicKey });\nexport { patchedSecp256k1 as secp256k1 };";
const esmExportNeedle = 'export const secp256k1';

const nodeModulesSegment = `${path.sep}node_modules${path.sep}`;
const nobleCurvesSegment = `${path.sep}@noble${path.sep}curves${path.sep}secp256k1.js`;

function shouldPatch(filename) {
  if (!filename.endsWith('secp256k1.js')) {
    return false;
  }
  const normalized = path.normalize(filename);
  return (
    normalized.includes(nodeModulesSegment) &&
    normalized.includes(nobleCurvesSegment)
  );
}

function patchNobleCurvesSecp256k1(src, filename) {
  if (!shouldPatch(filename)) {
    return src;
  }
  if (src.includes(cjsPatch) || src.includes(esmPatch)) {
    return src;
  }
  if (src.includes(esmExportNeedle)) {
    const withoutExport = src.replace(esmExportNeedle, 'const secp256k1');
    return `${withoutExport}\n${esmPatch}\n`;
  }
  if (src.includes('exports.secp256k1')) {
    return `${src}\n${cjsPatch}\n`;
  }
  throw new Error(`Failed to patch @noble/curves secp256k1 in ${filename}`);
}

module.exports = { patchNobleCurvesSecp256k1 };
