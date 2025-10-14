import { createSelector } from 'reselect';
import { compare } from 'compare-versions';
import { isRemoteFeatureFlagOverrideActivated } from '../../../core/Engine/controllers/remote-feature-flag-controller';
import { StateWithPartialEngine } from '../types';

/**
 * Type guard for Bitcoin accounts feature flag value
 */
function isValidBitcoinAccountsFlag(
  value: unknown,
): value is { enabled: boolean; minimumVersion?: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as any).enabled === 'boolean'
  );
}

/**
 * Check if Bitcoin accounts feature flag is enabled with proper version check.
 * Uses compare-versions package for robust semver comparison.
 * 
 * @param flagValue - The bitcoinAccounts flag value (boolean or object with enabled/minimumVersion)
 * @returns True if flag is enabled and meets minimum version requirement
 */
export function isBitcoinAccountsEnabled(flagValue: unknown): boolean {
  // Default to false if flag is undefined (secure by default)
  if (flagValue === undefined) {
    return false;
  }
  
  // Simple boolean flag (legacy support)
  if (typeof flagValue === 'boolean') {
    return flagValue;
  }
  
  // Object with enabled and minimumVersion properties
  if (isValidBitcoinAccountsFlag(flagValue)) {
    const { enabled, minimumVersion } = flagValue;
    
    if (!enabled) {
      return false;
    }
    
    // If no minimum version specified, feature is enabled
    if (!minimumVersion) {
      return true;
    }
    
    // Get current version from package.json via environment
    const currentVersion = process.env.npm_package_version || '7.58.0';
    
    try {
      // Use compare-versions for proper semver comparison
      return compare(currentVersion, minimumVersion, '>=');
    } catch {
      // If version comparison fails, default to enabled for backwards compatibility
      return true;
    }
  }
  
  return false; // Default to false for invalid flag structures
}

// Legacy function name for backwards compatibility
export function isAddBitcoinFlagEnabled(flagValue: unknown): boolean {
  return isBitcoinAccountsEnabled(flagValue);
}

const selectRemoteFeatureFlagControllerState = (
  state: StateWithPartialEngine,
) => state.engine.backgroundState.RemoteFeatureFlagController;

const selectRemoteFeatureFlags = createSelector(
  selectRemoteFeatureFlagControllerState,
  (remoteFeatureFlagControllerState) => {
    if (isRemoteFeatureFlagOverrideActivated) {
      return {};
    }
    return remoteFeatureFlagControllerState?.remoteFeatureFlags ?? {};
  },
);

/**
 * Selector to check if Bitcoin accounts feature is enabled with version check.
 * Uses bitcoinAccounts flag with fallback to legacy addBitcoinAccount.
 */
export const selectIsBitcoinAccountsEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => 
    isBitcoinAccountsEnabled(remoteFeatureFlags.bitcoinAccounts) ||
    isAddBitcoinFlagEnabled(remoteFeatureFlags.addBitcoinAccount) // Legacy fallback
);

// Legacy selector for backwards compatibility
export const selectIsAddBitcoinAccountEnabled = selectIsBitcoinAccountsEnabled;
