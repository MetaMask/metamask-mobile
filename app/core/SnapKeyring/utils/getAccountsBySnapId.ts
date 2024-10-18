///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import { SnapKeyring } from '@metamask/eth-snap-keyring';
import { SnapId } from '@metamask/snaps-sdk';
import Engine from '../../../core/Engine';

/**
 * Get the addresses of the accounts managed by a given Snap.
 *
 * @param snapId - Snap ID to get accounts for.
 * @returns The addresses of the accounts.
 */
export const getAccountsBySnapId = async (snapId: SnapId) => {
  const snapKeyring: SnapKeyring =
    (await Engine.getSnapKeyring()) as SnapKeyring;
  return await snapKeyring.getAccountsBySnapId(snapId);
};
///: END:ONLY_INCLUDE_IF
