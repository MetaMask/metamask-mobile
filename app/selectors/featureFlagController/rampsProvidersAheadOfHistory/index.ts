import { createSelector } from 'reselect';
import { isObject } from '@metamask/utils';
import { selectRemoteFeatureFlags } from '..';
import { FeatureFlagNames } from '../../../constants/featureFlags';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

const EMPTY_PROVIDER_IDS: string[] = [];

/**
 * Provider ids that the UB2 Buy pre-selection puts ahead of the user's order
 * history when they offer the token (the user's own pick still wins).
 *
 * Flag shape: `{ enabled, minimumVersion, providerIds: string[] }`.
 * Returns an empty list (history first) when the flag is missing, invalid,
 * disabled or below the minimum version.
 */
export const selectRampsProvidersAheadOfHistory = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): string[] => {
    const rawFlag =
      remoteFeatureFlags[FeatureFlagNames.rampsProvidersAheadOfHistory];
    if (!validatedVersionGatedFeatureFlag(rawFlag)) {
      return EMPTY_PROVIDER_IDS;
    }
    // A progressive rollout wraps the flag in `{ name, value }`.
    const flag =
      isObject(rawFlag) && isObject(rawFlag.value) ? rawFlag.value : rawFlag;
    const providerIds = isObject(flag) ? flag.providerIds : undefined;
    if (
      !Array.isArray(providerIds) ||
      !providerIds.every((id) => typeof id === 'string' && id.length > 0)
    ) {
      return EMPTY_PROVIDER_IDS;
    }
    return providerIds as string[];
  },
);
