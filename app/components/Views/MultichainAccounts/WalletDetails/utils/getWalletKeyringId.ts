import { InternalAccount } from '@metamask/keyring-internal-api';

/**
 * Utility function to get the keyring ID from a wallet's accounts
 * @param accounts - The InternalAccount[] of a wallet
 * @returns The keyring ID string or null if no keyring ID can be determined
 */
export const getWalletKeyringId = (
  accounts: InternalAccount[],
): string | null => {
  // Get keyring ID from the first account's entropy source if available
  if (accounts.length > 0) {
    const firstAccount = accounts[0];
    // For HD and first-party snap accounts, use the entropy source
    if (firstAccount.options?.entropySource) {
      return firstAccount.options.entropySource as string;
    }
  }

  return null;
};
