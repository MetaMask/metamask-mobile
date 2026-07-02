import type { WalletOptions } from '@metamask/wallet';
import { Encryptor, LEGACY_DERIVATION_OPTIONS } from '../../../Encryptor';
import type { RootMessenger } from '../../types';
import { getKeyringBuilders, getKeyringV2Builders } from '../keyrings';

type KeyringControllerInstanceOptions = NonNullable<
  WalletOptions['instanceOptions']['keyringController']
>;

/**
 * @param messenger - Needed to build the V1 keyring builders, some of which
 * interact with the shared bus.
 */
export function getKeyringControllerInstanceOptions(
  messenger: RootMessenger,
): KeyringControllerInstanceOptions {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  return {
    encryptor,
    keyringBuilders: getKeyringBuilders(messenger),
    keyringV2Builders: getKeyringV2Builders(),
  };
}
