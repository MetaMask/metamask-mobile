import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const DEFAULT_OTA_UPDATES_ENABLED = false;
export const OTA_UPDATES_FLAG_NAME = 'otaUpdatesEnabled';

/**
 * Selector for the OTA updates enabled flag.
 * Returns false when basic functionality is disabled via selectRemoteFeatureFlags.
 */
export const selectOtaUpdatesEnabledFlag = createSelector(
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

/** @deprecated Use selectOtaUpdatesEnabledFlag — basic functionality is gated centrally. */
export const selectOtaUpdatesEnabledRawFlag = selectOtaUpdatesEnabledFlag;
