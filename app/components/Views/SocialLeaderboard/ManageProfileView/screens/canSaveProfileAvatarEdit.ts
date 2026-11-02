import type { NetworkTier } from '../../../../../util/deviceCapability/types';

/**
 * Whether an avatar edit can be written to the profile API.
 *
 * @param networkTier - Current network tier. `null` still allows a save.
 * @returns False when the network tier is `NONE`.
 */
export const canSaveProfileAvatarEdit = (
  networkTier: NetworkTier | null,
): boolean => networkTier !== 'NONE';
