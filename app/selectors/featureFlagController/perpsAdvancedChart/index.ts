import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  VersionGatedFeatureFlag,
  validatedVersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

export const selectPerpsAdvancedChartEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean => {
    // Explicit env override takes precedence over the remote flag (dev/QA use).
    const envOverride = process.env.MM_PERPS_ADVANCED_CHART_ENABLED;
    if (envOverride === 'true') return true;
    if (envOverride === 'false') return false;

    const remoteFlag =
      remoteFeatureFlags?.perpsAdvancedChartEnabled as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
