import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

/**
 * Selector for PNA25 feature flag
 * Uses feature flag `extensionUxPna25` from remote feature flag config
 *
 * @returns {boolean} True if PNA25 feature is enabled
 */
export const selectIsPna25FlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    Boolean(remoteFeatureFlags?.extensionUxPna25),
);
