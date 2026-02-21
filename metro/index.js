/* eslint-disable import/no-commonjs */
const { patchNobleCurvesSecp256k1 } = require('./noble-curves-secp256k1');
const { patchNobleHashesHmac } = require('./noble-hashes-hmac');
const { patchNobleHashesSha3 } = require('./noble-hashes-sha3');

function patchNobleLibraries(src, filename) {
  src = patchNobleCurvesSecp256k1(src, filename);
  src = patchNobleHashesHmac(src, filename);
  src = patchNobleHashesSha3(src, filename);
  return src;
}

module.exports = { patchNobleLibraries };
