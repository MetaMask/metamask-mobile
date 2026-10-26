import type { NetworkTier } from '../../../../../util/deviceCapability/types';

/**
 * Saving an avatar writes to the profile API. Offline skips that write.
 * Unknown network stays on the product path. Hardware tier does not gate the
 * save; the picker carousel already lightens motion on LOW devices.
 */
export const canSaveProfileAvatarEdit = (
  networkTier: NetworkTier | null,
): boolean => networkTier !== 'NONE';
