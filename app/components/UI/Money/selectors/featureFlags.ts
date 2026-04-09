import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '../../../../selectors/featureFlagController';
import {
  validatedVersionGatedFeatureFlag,
  VersionGatedFeatureFlag,
} from '../../../../util/remoteFeatureFlag';
import { isMoneyAccountEnabled } from '../../../../lib/Money/feature-flags';

export const selectMoneyHomeScreenEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const localFlag = process.env.MM_MONEY_HOME_SCREEN_ENABLED === 'true';
    const remoteFlag =
      remoteFeatureFlags?.moneyHomeScreenEnabled as unknown as VersionGatedFeatureFlag;

    return validatedVersionGatedFeatureFlag(remoteFlag) ?? localFlag;
  },
);

export const selectMoneyEnableMoneyAccountFlag = createSelector(
  selectRemoteFeatureFlags,
  isMoneyAccountEnabled,
);
