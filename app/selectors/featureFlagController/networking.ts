import { createSelector } from 'reselect';
import { validatedVersionGatedFeatureFlag } from '../../util/remoteFeatureFlag';
import { selectRemoteFeatureFlags } from './index';

export const TIER_POLICY_BUILD_DEFAULT =
  process.env.MM_NETWORKING_TIER_POLICIES_ENABLED === 'true';

export const selectTierPolicyEnabled = createSelector(
  selectRemoteFeatureFlags,
  (flags): boolean =>
    validatedVersionGatedFeatureFlag(flags.mobileNetworkingTierPolicies) ??
    TIER_POLICY_BUILD_DEFAULT,
);
