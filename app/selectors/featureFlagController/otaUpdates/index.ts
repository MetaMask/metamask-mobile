import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectBasicFunctionalityEnabled } from '../../settings';

const DEFAULT_OTA_UPDATES_ENABLED = false;
export const OTA_UPDATES_FLAG_NAME = 'otaUpdatesEnabled';

/**
 * Selector for the raw OTA updates enabled remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectOtaUpdatesEnabledRawFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, OTA_UPDATES_FLAG_NAME)) {
      return DEFAULT_OTA_UPDATES_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      OTA_UPDATES_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_OTA_UPDATES_ENABLED
    );
  },
);

/**
 * Selector for the OTA updates enabled flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectOtaUpdatesEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectOtaUpdatesEnabledRawFlag,
  (isBasicFunctionalityEnabled, otaUpdatesEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return otaUpdatesEnabledRawFlag;
  },
);
