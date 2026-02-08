/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/no-commonjs */
/* eslint-disable import/no-nodejs-modules */
import { Buffer } from '@craftzdog/react-native-buffer';

import { keccak256 } from '@metamask/native-utils';

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
