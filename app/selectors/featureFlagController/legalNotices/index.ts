import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';

/**
 * Selector for PNA25 feature flag
 * Checks the environment variable `MM_EXTENSION_UX_PNA25` to override the remote flag
 *
 * @returns {boolean} True if PNA25 feature is enabled
 */
export const selectIsPna25FlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteValue = remoteFeatureFlags?.extensionUxPna25;

    return getFeatureFlagValue(
      process.env.MM_EXTENSION_UX_PNA25,
      Boolean(remoteValue),
    );
  },
);
