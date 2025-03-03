import { SnapId } from '@metamask/snaps-sdk';
import PREINSTALLED_SNAPS from '../../../lib/snaps/preinstalled-snaps';

/**
 * Check if a Snap is a preinstalled Snap.
 *
 * @param snapId - Snap ID to verify.
 * @returns True if Snap is a preinstalled Snap, false otherwise.
 */
export function isSnapPreinstalled(snapId: SnapId) {
  return PREINSTALLED_SNAPS.some((snap) => snap.snapId === snapId);
}
