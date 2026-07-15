import { createSelector } from 'reselect';
import { hasProperty } from '@metamask/utils';
import { selectRemoteFeatureFlags } from './index';
import { FeatureFlagNames } from '../../constants/featureFlags';
import {
  validatedVersionGatedFeatureFlag,
  type VersionGatedFeatureFlag,
} from '../../util/remoteFeatureFlag';

const DEFAULT_COMPLIANCE_ENABLED = false;

/**
 * Select whether OFAC compliance checking is enabled via feature flag.
 * Handles version-gated flag shape: `{ enabled: boolean, minimumVersion: string }`
 * and boolean local overrides (same as complianceControllerInit) so init and UI stay in sync.
 */
export const selectComplianceEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, FeatureFlagNames.complianceEnabled)) {
      return DEFAULT_COMPLIANCE_ENABLED;
    }
    const rawFlag = remoteFeatureFlags[FeatureFlagNames.complianceEnabled];

    // Boolean local overrides (dev tools): align with complianceControllerInit
    if (typeof rawFlag === 'boolean') {
      return rawFlag;
    }

    const remoteFlag = rawFlag as unknown as VersionGatedFeatureFlag;
    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ?? DEFAULT_COMPLIANCE_ENABLED
    );
  },
);
