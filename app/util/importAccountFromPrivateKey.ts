import { Authentication } from '../core';

/**
 * Imports an account from a private key
 *
 * @param {String} private_key - String corresponding to a private key
 * @returns {Promise} - Returns a promise
 */
export async function importAccountFromPrivateKey(private_key: string) {
  const isPasswordOutdated =
    await Authentication.checkIsSeedlessPasswordOutdated(true);
  if (isPasswordOutdated) {
    // no need to handle error here, password outdated state will trigger modal that force user to log out
    return;
  }

  await Authentication.importAccountFromPrivateKey(private_key);
}
