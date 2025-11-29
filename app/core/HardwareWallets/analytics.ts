import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../Engine';
import { Keyring } from '@metamask/keyring-api';

interface KeyringWithAccounts extends Keyring {
  accounts?: string[];
}

export const getConnectedDevicesCount = async (): Promise<number> => {
  const { KeyringController } = Engine.context;

  const keyringResults = await Promise.allSettled([
    KeyringController.getKeyringsByType(KeyringTypes.ledger),
    KeyringController.getKeyringsByType(KeyringTypes.qr),
    KeyringController.getKeyringsByType(KeyringTypes.lattice),
    KeyringController.getKeyringsByType(KeyringTypes.trezor),
    KeyringController.getKeyringsByType(KeyringTypes.oneKey),
  ]);

  return keyringResults.reduce((acc, result) => {
    if (result.status === 'fulfilled' && Array.isArray(result.value)) {
      const keyrings = result.value as KeyringWithAccounts[];
      return (
        acc +
        keyrings.filter((keyring) => {
          const accounts = keyring.accounts;
          return Array.isArray(accounts) && accounts.length > 0;
        }).length
      );
    }
    return acc;
  }, 0);
};
