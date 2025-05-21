import { AccountImportStrategy } from '@metamask/keyring-controller';
import Engine from '../core/Engine';
import { store } from '../store';
import { getTraceTags } from './sentry/tags';
import { endTrace, trace, TraceName, TraceOperation } from './trace';
import { toChecksumHexAddress } from '@metamask/controller-utils';

/**
 * Imports an account from a private key
 *
 * @param {String} private_key - String corresponding to a private key
 * @returns {Promise} - Returns a promise
 */
export async function importAccountFromPrivateKey(private_key: string) {
  trace({
    name: TraceName.ImportEvmAccount,
    op: TraceOperation.ImportAccount,
    tags: getTraceTags(store.getState()),
  });

  const { KeyringController } = Engine.context;
  // Import private key
  let pkey = private_key;
  // Handle PKeys with 0x
  if (pkey.length === 66 && pkey.substr(0, 2) === '0x') {
    pkey = pkey.substr(2);
  }
  const importedAccountAddress =
    await KeyringController.importAccountWithStrategy(
      AccountImportStrategy.privateKey,
      [pkey],
    );
  const checksummedAddress = toChecksumHexAddress(importedAccountAddress);
  Engine.setSelectedAddress(checksummedAddress);

  endTrace({
    name: TraceName.ImportEvmAccount,
  });
}
