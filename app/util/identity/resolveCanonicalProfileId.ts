import type { KeyringControllerState } from '@metamask/keyring-controller';
import type { AuthenticationController } from '@metamask/profile-sync-controller';

import ExtendedKeyringTypes from '../../constants/keyringTypes';

/**
 * Resolves the profile belonging to the live primary SRP.
 *
 * Authentication sessions can outlive a reset, so callers must bind them to
 * the primary HD keyring currently exposed by KeyringController.
 */
export const resolveCanonicalProfileId = (
  authenticationState: AuthenticationController.AuthenticationControllerState,
  keyringState: KeyringControllerState,
): string | undefined => {
  const primaryEntropySourceId = keyringState.keyrings.find(
    (keyring) => keyring.type === ExtendedKeyringTypes.hd,
  )?.metadata.id;
  return primaryEntropySourceId
    ? authenticationState.srpSessionData?.[primaryEntropySourceId]?.profile
        ?.canonicalProfileId || undefined
    : undefined;
};
