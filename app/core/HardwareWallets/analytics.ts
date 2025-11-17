import { KeyringTypes } from '@metamask/keyring-controller';
import Engine from '../Engine';

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
    if (result.status === 'fulfilled') {
      return acc + result.value.length;
    }
    return acc;
  }, 0);
};
