/* eslint-disable import-x/no-commonjs, import-x/no-nodejs-modules */
/* global globalThis */
/*
 * Playwright runs FixtureBuilder in Node, but the mobile app resolves
 * @metamask/native-utils through React Native/Metro. The native package is ESM
 * and depends on react-native-nitro-modules, so CommonJS dependency patches
 * cannot require it in the Playwright process. This shim only affects Node's
 * CommonJS loader in the current process.
 */
const Module = require('module');
const { secp256k1 } = require('@noble/curves/secp256k1');
const { ed25519 } = require('@noble/curves/ed25519');
const { hmac } = require('@noble/hashes/hmac');
const { sha512 } = require('@noble/hashes/sha2');
const { keccak_256: keccak256 } = require('@noble/hashes/sha3');

const registerKey = Symbol.for('metamask.playwright.nativeUtilsNodeShim');

const nativeUtilsMock = {
  getPublicKey: secp256k1.getPublicKey,
  getPublicKeyEd25519: ed25519.getPublicKey,
  hmacSha512: (key, data) => hmac(sha512, key, data),
  keccak256,
  multiply: (a, b) => a * b,
  pubToAddress: (pubKey, sanitize = false) => {
    let key = pubKey;

    if (sanitize && pubKey.length !== 64) {
      key = secp256k1.ProjectivePoint.fromHex(pubKey)
        .toRawBytes(false)
        .slice(1);
    }

    if (key.length !== 64) {
      throw new Error('Expected pubKey to be of length 64');
    }

    return keccak256(key).subarray(-20);
  },
};

const existingRegistration = globalThis[registerKey];

if (existingRegistration) {
  module.exports = existingRegistration.nativeUtilsMock;
} else {
  const originalLoad = Module._load;

  Module._load = function loadWithNativeUtilsShim(request, parent, isMain) {
    if (request === '@metamask/native-utils') {
      return nativeUtilsMock;
    }

    return originalLoad.call(this, request, parent, isMain);
  };

  globalThis[registerKey] = {
    nativeUtilsMock,
  };

  module.exports = nativeUtilsMock;
}
