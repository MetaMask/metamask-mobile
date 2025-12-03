import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../Engine';
import { Json, Keyring } from '@metamask/utils';

export const getConnectedDevicesCount = async (): Promise<number> => {
  const { KeyringController } = Engine.context;

  const keyringResults = await Promise.allSettled([
    KeyringController.getKeyringsByType(KeyringTypes.ledger),
    KeyringController.getKeyringsByType(KeyringTypes.qr),
    KeyringController.getKeyringsByType(KeyringTypes.lattice),
    KeyringController.getKeyringsByType(KeyringTypes.trezor),
    KeyringController.getKeyringsByType(KeyringTypes.oneKey),
  ]);

  let count = 0;
  for (const result of keyringResults) {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      // TODO: use type from keyring-utils
      const keyrings = result.value as unknown as Keyring<Json>[];
      for (const keyring of keyrings) {
        const accounts = await keyring.getAccounts();
        if (Array.isArray(accounts) && accounts.length > 0) {
          count++;
        }
      }
    }
  }
  return count;
};
