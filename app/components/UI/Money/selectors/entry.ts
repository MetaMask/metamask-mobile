import { createSelector } from 'reselect';
import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import type { MoneyEntryContext } from '../navigation/moneyEntryDecision';

/**
 * Resolves whether a Money entry must show the intro splash first.
 */
export const selectIsMoneySplashRedirectNeeded = createSelector(
  selectMoneySplashSeen,
  (hasSeenSplash) => !hasSeenSplash,
);

/**
 * Provides the stable context consumed by Money entry navigation.
 */
export const selectMoneyEntryContext = createSelector(
  selectMoneyAccountAccessBlockReason,
  selectIsMoneySplashRedirectNeeded,
  (accessBlockReason, isSplashRedirectNeeded): MoneyEntryContext => ({
    accessBlockReason,
    isSplashRedirectNeeded,
  }),
);
