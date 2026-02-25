import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { getFeatureFlagValue } from '../env';

/**
 * Selector for PNA25 feature flag.
 * When GITHUB_ACTIONS (and not E2E): use only remote (builds.yml). Otherwise
 * MM_EXTENSION_UX_PNA25 can override the remote flag.
 *
 * @returns {boolean} True if PNA25 feature is enabled
 */
export const selectIsPna25FlagEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    const remoteValue = remoteFeatureFlags?.extensionUxPna25;
    const useRemoteOnly =
      process.env.GITHUB_ACTIONS === 'true' && process.env.E2E !== 'true';

    if (useRemoteOnly) {
      return remoteValue === true;
    }

    return getFeatureFlagValue(
      process.env.MM_EXTENSION_UX_PNA25,
      remoteValue === true,
    );
  },
);
