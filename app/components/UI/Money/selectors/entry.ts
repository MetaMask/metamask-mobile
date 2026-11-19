import { createSelector } from 'reselect';
import { selectMoneySplashSeen } from '../../../../reducers/user/selectors';
import { selectLastKnownMoneyBalance } from '../../../../core/redux/slices/moneyBalance';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectMoneyAccountAccessBlockReason } from './visibility';
import type { MoneyEntryContext } from '../navigation/moneyEntryDecision';
import {
  hasConfirmedMoneyDeposit,
  isPositiveMoneyBalance,
} from '../utils/moneyAccountUsage';

/**
 * Users who have already funded or deposited into Money should not see the
 * intro splash again.
 */
export const selectHasUsedMoneyAccount = createSelector(
  selectLastKnownMoneyBalance,
  selectNonReplacedTransactions,
  (lastKnownBalance, transactions) =>
    isPositiveMoneyBalance(lastKnownBalance) ||
    hasConfirmedMoneyDeposit(transactions),
);

export const selectIsMoneySplashRedirectNeeded = createSelector(
  selectMoneySplashSeen,
  selectHasUsedMoneyAccount,
  (hasSeenSplash, hasUsedMoneyAccount) =>
    !hasSeenSplash && !hasUsedMoneyAccount,
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
