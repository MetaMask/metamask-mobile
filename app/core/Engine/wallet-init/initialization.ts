import { Wallet } from '@metamask/wallet';
import { Json } from '@metamask/utils';
import { getKeyringBuilders } from './keyrings';
import { RootMessenger } from '../types';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../Encryptor';
import { mobileStorageAdapter } from '../utils/storage-service-utils';

export function initializeWallet({
  messenger,
  state,
}: {
  messenger: RootMessenger;
  state: Record<string, Record<string, Json> | undefined>;
}) {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  return new Wallet({
    messenger,
    state,
    instanceOptions: {
      keyringController: {
        encryptor,
        keyringBuilders: getKeyringBuilders(messenger),
      },
      storageService: {
        storage: mobileStorageAdapter,
      },
    },
  });
}
