///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { isSnapKeyring } from '@metamask/eth-snap-keyring/v2';
import { SnapId } from '@metamask/snaps-sdk';
import Engine from '../../../core/Engine';

/**
 * Get the addresses of the accounts managed by a given Snap.
 *
 * @param snapId - Snap ID to get accounts for.
 * @returns The addresses of the accounts.
 */
export const getAccountsBySnapId = async (
  snapId: SnapId,
): Promise<string[]> => {
  try {
    return (await Engine.context.KeyringController.withKeyringV2(
      {
        filter: (keyring) =>
          // Compare as strings: the keyring's `SnapId` brand comes from a
          // separate copy of `@metamask/snaps-sdk`, which TypeScript treats
          // as a distinct opaque type.
          isSnapKeyring(keyring) && (keyring.snapId as string) === snapId,
      },
      async ({ keyring }) => {
        if (!isSnapKeyring(keyring)) {
          return [];
        }
        const accounts = await keyring.getAccounts();
        return accounts.map((account) => account.address);
      },
    )) as string[];
  } catch {
    // No keyring for this Snap.
    return [];
  }
};
///: END:ONLY_INCLUDE_IF
