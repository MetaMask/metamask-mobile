import { createSelector } from 'reselect';
import {
  hasVersionGatedFeatureFlagMinimumVersion,
  validatedVersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from './index';

/** Resolves the networking policy switch, falling back for ineligible flags. */
export function resolveTierPolicyEnabled(
  flag?: unknown,
  fallback = process.env.MM_NETWORKING_TIER_POLICIES_ENABLED === 'true',
): boolean {
  try {
    if (hasVersionGatedFeatureFlagMinimumVersion(flag)) {
      const enabled = validatedVersionGatedFeatureFlag(flag);
      if (enabled !== undefined) return enabled;
    }
  } catch {
    // Malformed remote versions cannot prevent using the build default.
  }
  return fallback;
}

export const selectTierPolicyEnabled = createSelector(
  selectRemoteFeatureFlags,
  (flags) => resolveTierPolicyEnabled(flags.mobileNetworkingTierPolicies),
);
