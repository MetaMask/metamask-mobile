import { SnapId } from '@metamask/snaps-sdk';
import PREINSTALLED_SNAPS from '../../../lib/snaps/preinstalled-snaps';
import { BITCOIN_WALLET_SNAP_ID } from '../BitcoinWalletSnap';
import { SOLANA_WALLET_SNAP_ID } from '../SolanaWalletSnap';
import {
  getLocalizedSnapManifest,
  stripSnapPrefix,
} from '@metamask/snaps-utils';
import { SnapKeyringBuilderMessenger } from '../types';
import I18n from '../../../../locales/i18n';

/**
 * Check if a Snap is a preinstalled Snap.
 *
 * @param snapId - Snap ID to verify.
 * @returns True if Snap is a preinstalled Snap, false otherwise.
 */
export function isSnapPreinstalled(snapId: SnapId) {
  return PREINSTALLED_SNAPS.some((snap) => snap.snapId === snapId);
}

/**
 * A constant array that contains the IDs of whitelisted multichain
 * wallet Snaps. These Snaps can be used by the extension to implement
 * core features (e.g. Send flow).
 *
 * @constant
 * @type {SnapId[]}
 */
const ALLOW_LISTED_SNAPS = [BITCOIN_WALLET_SNAP_ID, SOLANA_WALLET_SNAP_ID];

/**
 * Checks if the given Snap ID corresponds to a multichain wallet Snap.
 *
 * @param id - The ID of the Snap to check.
 * @returns True if the Snap ID is in the whitelist, false otherwise.
 */
export function isMultichainWalletSnap(id: SnapId): boolean {
  return ALLOW_LISTED_SNAPS.includes(id);
}

/**
 * Get the localized Snap name or some fallback name otherwise.
 *
 * @param snapId - Snap ID.
 * @param messenger - Snap keyring messenger.
 * @returns The Snap name.
 */
export function getSnapName(
  snapId: SnapId,
  messenger: SnapKeyringBuilderMessenger,
) {
  const snap = messenger.call('SnapController:get', snapId);
  const currentLocale = I18n.locale;

  if (!snap) {
    return stripSnapPrefix(snapId);
  }

  if (snap.localizationFiles) {
    const localizedManifest = getLocalizedSnapManifest(
      snap.manifest,
      currentLocale,
      snap.localizationFiles,
    );
    return localizedManifest.proposedName;
  }

  return snap.manifest.proposedName;
}
