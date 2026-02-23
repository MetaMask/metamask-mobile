import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from './index';
import { FeatureFlagNames } from '../../constants/featureFlags';

/**
 * Select whether OFAC compliance checking is enabled via feature flag.
 */
export const selectComplianceEnabled = createSelector(
  selectRemoteFeatureFlags,
  (flags) => Boolean(flags[FeatureFlagNames.complianceEnabled]),
);
