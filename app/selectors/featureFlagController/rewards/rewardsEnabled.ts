import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { hasProperty } from '@metamask/utils';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../util/remoteFeatureFlag';
import { selectBasicFunctionalityEnabled } from '../../settings';

export const MISSING_ENROLLED_ACCOUNTS_FLAG_NAME =
  'rewards-missing-enrolled-accounts';

const DEFAULT_MISSING_ENROLLED_ACCOUNTS_ENABLED = false;

/**
 * Selector for the raw missing enrolled accounts remote flag value.
 * Returns the flag value without considering basic functionality.
 */
export const selectMissingEnrolledAccountsRewardsEnabledRawFlag =
  createSelector(selectRemoteFeatureFlags, (remoteFeatureFlags) => {
    if (!hasProperty(remoteFeatureFlags, MISSING_ENROLLED_ACCOUNTS_FLAG_NAME)) {
      return DEFAULT_MISSING_ENROLLED_ACCOUNTS_ENABLED;
    }
    const remoteFlag = remoteFeatureFlags[
      MISSING_ENROLLED_ACCOUNTS_FLAG_NAME
    ] as unknown as VersionGatedFeatureFlag;

    return (
      validatedVersionGatedFeatureFlag(remoteFlag) ??
      DEFAULT_MISSING_ENROLLED_ACCOUNTS_ENABLED
    );
  });

/**
 * Selector for the missing enrolled accounts flag.
 * Returns false if basic functionality is disabled, otherwise returns the remote flag value.
 */
export const selectMissingEnrolledAccountsRewardsEnabledFlag = createSelector(
  selectBasicFunctionalityEnabled,
  selectMissingEnrolledAccountsRewardsEnabledRawFlag,
  (isBasicFunctionalityEnabled, missingEnrolledAccountsEnabledRawFlag) => {
    if (!isBasicFunctionalityEnabled) {
      return false;
    }
    return missingEnrolledAccountsEnabledRawFlag;
  },
);
