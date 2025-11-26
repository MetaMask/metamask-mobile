/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-commonjs */
/**
 * Mock for @metamask/native-utils
 *
 * This module uses react-native-nitro-modules which requires native code.
 * In Jest tests, we use the original JavaScript implementations from @noble packages.
 */

const { secp256k1 } = require('@noble/curves/secp256k1');
const { ed25519 } = require('@noble/curves/ed25519');
const { keccak_256 } = require('@noble/hashes/sha3');
const { hmac } = require('@noble/hashes/hmac');
const { sha512 } = require('@noble/hashes/sha2');

export const getPublicKey = secp256k1.getPublicKey;
export const keccak256 = keccak_256;
export const hmacSha512 = (key, data) => hmac(sha512, key, data);
export const getPublicKeyEd25519 = ed25519.getPublicKey;
export const multiply = (a, b) => a * b;

/**
 * Reimplemented from @ethereumjs/util.
 *
 * We cannot import pubToAddress from @ethereumjs/util directly because it's
 * patched to use @metamask/native-utils, which would cause infinite recursion:
 *   1. Our mock's pubToAddress is called
 *   2. It requires @ethereumjs/util
 *   3. @ethereumjs/util's exports.pubToAddress = require('@metamask/native-utils').pubToAddress
 *   4. That returns our mock's pubToAddress
 *   5. We call ourselves → stack overflow
 */
export const pubToAddress = (pubKey, sanitize = false) => {
  let key = pubKey;
  if (sanitize && pubKey.length !== 64) {
    key = secp256k1.ProjectivePoint.fromHex(pubKey).toRawBytes(false).slice(1);
  }
  if (key.length !== 64) {
    throw new Error('Expected pubKey to be of length 64');
  }
  return keccak_256(key).subarray(-20);
};
