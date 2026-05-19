import { Wallet } from '@metamask/wallet';
import { Json } from '@metamask/utils';
import { getKeyringBuilders } from './keyrings';
import { RootMessenger } from '../types';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../Encryptor';

export function initializeWallet(
  messenger: RootMessenger,
  state: Record<string, Record<string, Json>>,
) {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  return new Wallet({
    messenger,
    state,
    instanceOptions: {
      KeyringController: {
        encryptor,
        keyringBuilders: getKeyringBuilders(messenger),
      },
    },
  });
}
