import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';

interface MoneyAccountFeatureFlag {
  moneyAccountDepositEnabled?: boolean;
  moneyAccountWithdrawEnabled?: boolean;
}

export const selectMoneyAccountDepositEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const flag =
      remoteFeatureFlags?.moneyAccount as unknown as MoneyAccountFeatureFlag;
    return flag?.moneyAccountDepositEnabled ?? false;
  },
);

export const selectMoneyAccountWithdrawEnabledFlag = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags) => {
    const flag =
      remoteFeatureFlags?.moneyAccount as unknown as MoneyAccountFeatureFlag;
    return flag?.moneyAccountWithdrawEnabled ?? false;
  },
);
