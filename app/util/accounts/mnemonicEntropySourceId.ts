import type { InternalAccount } from '@metamask/keyring-internal-api';
import ExtendedKeyringTypes from '../../constants/keyringTypes';

/**
 * Entropy source id of an HD account.
 *
 * Imported, hardware, and snap accounts are not mnemonic ownership. An HD
 * account with no entropy id cannot be matched to a profile.
 */
export const mnemonicEntropySourceId = (
  account: InternalAccount,
): string | undefined => {
  if (account.metadata.keyring.type !== ExtendedKeyringTypes.hd) {
    return undefined;
  }
  const entropySource = account.options.entropySource;
  return typeof entropySource === 'string' && entropySource.length > 0
    ? entropySource
    : undefined;
};
