import { RootState } from '../../../../reducers';

export const selectUpgradeSplashPageAcknowledgedForAccounts = (
  rootState: RootState,
): string[] => rootState.confirmation.upgradeSplashPageAcknowledgedForAccounts;
