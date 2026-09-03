import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';

// TODO: Remove hardcoded true when feature flag is properly configured
const DEFAULT_FULL_PAGE_ACCOUNT_LIST_ENABLED = false;
export const FULL_PAGE_ACCOUNT_LIST_FLAG_NAME = 'fullPageAccountList';

/**
 * Selector for the full page account list enabled flag.
 * Returns false when basic functionality is disabled via selectRemoteFeatureFlags.
 */
export const selectFullPageAccountListEnabledFlag = createSelector(
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

/** @deprecated Use selectFullPageAccountListEnabledFlag — basic functionality is gated centrally. */
export const selectFullPageAccountListEnabledRawFlag =
  selectFullPageAccountListEnabledFlag;
