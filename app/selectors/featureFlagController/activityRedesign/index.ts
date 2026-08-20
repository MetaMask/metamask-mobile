import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import { validatedVersionGatedFeatureFlag } from '../../../util/remoteFeatureFlag';

export const ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME =
  'tmcuActivityRedesignEnabled';
export const ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME =
  'tmcuTransactionsRedesignEnabled';

const isActivityRedesignFlagEnabled = (remoteFlag: unknown): boolean =>
  validatedVersionGatedFeatureFlag(remoteFlag) ?? remoteFlag === true;

export const selectIsActivityRedesignEnabled = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): boolean =>
    isActivityRedesignFlagEnabled(
      remoteFeatureFlags[ACTIVITY_REDESIGN_LIST_ITEMS_FLAG_NAME],
    ),
);

export const selectIsTransactionsRedesignEnabled = createSelector(
  selectIsActivityRedesignEnabled,
  selectRemoteFeatureFlags,
  (isActivityRedesignEnabled, remoteFeatureFlags): boolean =>
    isActivityRedesignEnabled &&
    isActivityRedesignFlagEnabled(
      remoteFeatureFlags[ACTIVITY_REDESIGN_DETAILS_PAGES_FLAG_NAME],
    ),
);
