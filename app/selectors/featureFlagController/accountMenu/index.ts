import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

const ACCOUNT_MENU_FLAG_KEY = 'mobileUxAccountMenu';

/**
 * Selector for the account menu feature flag.
 * Returns true if the feature is enabled AND the current version meets the minimum version requirement.
 */
export const selectAccountMenuEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const remoteFlag = remoteFeatureFlags[
      ACCOUNT_MENU_FLAG_KEY
    ] as unknown as VersionGatedFeatureFlag;
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  },
);
