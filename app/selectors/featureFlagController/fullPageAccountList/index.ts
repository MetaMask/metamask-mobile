import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectBasicFunctionalityEnabled } from '../../settings';

// TODO: Remove hardcoded true when feature flag is properly configured
const DEFAULT_FULL_PAGE_ACCOUNT_LIST_ENABLED = false;
export const FULL_PAGE_ACCOUNT_LIST_FLAG_NAME = 'fullPageAccountList';

/**
 * Selector for the raw full page account list remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectFullPageAccountListEnabledRawFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, FULL_PAGE_ACCOUNT_LIST_FLAG_NAME)) {
      return DEFAULT_FULL_PAGE_ACCOUNT_LIST_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      FULL_PAGE_ACCOUNT_LIST_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_FULL_PAGE_ACCOUNT_LIST_ENABLED
    );
  },
);

/**
 * Selector for the full page account list enabled flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectFullPageAccountListEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectFullPageAccountListEnabledRawFlag,
  (isBasicFunctionalityEnabled, fullPageAccountListEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return fullPageAccountListEnabledRawFlag;
  },
);
