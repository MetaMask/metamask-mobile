/* eslint-disable import-x/no-nodejs-modules */
import { randomUUID } from 'node:crypto';

/**
 * mockttp 4 calls `globalThis.crypto.randomUUID()`, which the shared Jest
 * crypto stub in `app/util/test/testSetup.js` does not provide. Call this in
 * unit tests that start a local mockttp server.
 */
export const installCryptoRandomUUID = (): void => {
  globalThis.crypto.randomUUID = randomUUID;
};
