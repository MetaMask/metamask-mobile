/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
import { Buffer } from '@craftzdog/react-native-buffer';

import { getPublicKey, hmacSha512, keccak256 } from '@metamask/native-utils';

// Monkey patch getPublicKey from @noble/curves with much faster C++ implementation
// IMPORTANT: This patching works only if @noble/curves version in root package.json is same as @noble/curves version in package.json of @scure/bip32.
const secp256k1_1 = require('@noble/curves/secp256k1');
secp256k1_1.secp256k1.getPublicKey = getPublicKey;

// Monkey patch hmacSha512 from @noble/hashes
const nobleHashesHmac = require('@noble/hashes/hmac');
const nobleHashesSha2 = require('@noble/hashes/sha2');
const originalHmac = nobleHashesHmac.hmac;
const patchedHmac = (hash, key, message) => {
  if (hash === nobleHashesSha2.sha512) {
    try {
      return hmacSha512(key, message);
    } catch (error) {
      console.error(
        'Error in @metamask/native-utils.hmacSha512, falling back to original implementation',
        error,
      );
    }
  }
  return originalHmac(hash, key, message);
};

// add missing hmac.create polyfill with original implementation
Object.assign(patchedHmac, originalHmac);
nobleHashesHmac.hmac = patchedHmac;

// Monkey patch keccak256 from @noble/hashes
const nobleHashesSha3 = require('@noble/hashes/sha3');
const originalNobleHashesSha3Keccak256 = nobleHashesSha3.keccak_256;
const patchedNobleHashesSha3Keccak256 = (value) => {
  try {
    return keccak256(value);
  } catch (error) {
    console.error(
      'Error in @metamask/native-utils.keccak256, falling back to original implementation',
      error,
    );
  }
  return originalNobleHashesSha3Keccak256(value);
};
// We need to use Object.assign to ensure added properties are not overridden (e.g. keccak_256.create())
Object.assign(
  patchedNobleHashesSha3Keccak256,
  originalNobleHashesSha3Keccak256,
);
nobleHashesSha3.keccak_256 = patchedNobleHashesSha3Keccak256;

// Monkey patch keccak256 from js-sha3
const jsSha3 = require('js-sha3');
const originalJsSha3Keccak256 = jsSha3.keccak_256;
const patchedJsSha3Keccak256 = (value) => {
  try {
    // js-sha3 returns hex string not Uint8Array
    return Buffer.from(keccak256(value)).toString('hex');
  } catch (error) {
    console.error(
      'Error in @metamask/native-utils.keccak256, falling back to original js-sha3 implementation',
      error,
    );
  }
  return originalJsSha3Keccak256(value);
};
// We need to use Object.assign to ensure added properties are not overridden (e.g. keccak256.create())
Object.assign(patchedJsSha3Keccak256, originalJsSha3Keccak256);
jsSha3.keccak_256 = patchedJsSha3Keccak256;
