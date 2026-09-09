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
 * TODO: Remove this parameter when we remove the DMK feature flag.
 * @param useDmk - Resolved DMK flag, threaded into the keyring builders so the
 * Ledger bridge choice agrees with the adapter choice.
 */
export function getKeyringControllerInstanceOptions(
  messenger: RootMessenger,
  // TODO: Remove this parameter when we remove the DMK feature flag.
  useDmk: boolean,
): KeyringControllerInstanceOptions {
  const encryptor = new Encryptor({
    keyDerivationOptions: LEGACY_DERIVATION_OPTIONS,
  });

  return {
    encryptor,
    keyringBuilders: getKeyringBuilders(messenger, useDmk),
    keyringV2Builders: getKeyringV2Builders(),
  };
}
