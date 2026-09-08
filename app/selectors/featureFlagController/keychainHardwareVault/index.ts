import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

/**
 * Remote, version-gated flag that enables the hardware-backed
 * `HardwareVaultKey` path in `SecureKeychain`. When disabled (default),
 * `SecureKeychain` uses the legacy foxCode-based encryption.
 *
 * Shape on the server:
 * `{ keychainHardwareVault: { enabled: true, minimumVersion: 'x.y.z' } }`
 */
export const selectKeychainHardwareVaultEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) =>
    validatedVersionGatedFeatureFlag(
      remoteFeatureFlags?.keychainHardwareVault,
    ) ?? false,
);
