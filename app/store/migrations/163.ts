import { captureException } from '@sentry/react-native';
import { getErrorMessage, hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';
import {
  hasConfirmedMoneyDeposit,
  isPositiveMoneyBalance,
} from '../../components/UI/Money/utils/moneyAccountUsage';

/**
 * Migration 163: let users who watched the Rive Money onboarding see the
 * splash, unless they already funded or deposited into Money. The old persist
 * transform copied `moneyOnboardingSeen` into `moneySplashSeen`, so those users
 * would otherwise skip the replacement FTUE.
 */
export const migrationVersion = 163;

export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  try {
    if (!hasProperty(state, 'user') || !isObject(state.user)) {
      return state;
    }

    if (state.user.moneyOnboardingSeen !== true) {
      return state;
    }

    const moneyBalance =
      hasProperty(state, 'moneyBalance') && isObject(state.moneyBalance)
        ? state.moneyBalance
        : undefined;
    const lastKnownBalance =
      moneyBalance && hasProperty(moneyBalance, 'lastKnownBalance')
        ? moneyBalance.lastKnownBalance
        : undefined;
    const transactionController =
      hasProperty(state.engine.backgroundState, 'TransactionController') &&
      isObject(state.engine.backgroundState.TransactionController)
        ? state.engine.backgroundState.TransactionController
        : undefined;
    const transactions =
      transactionController &&
      hasProperty(transactionController, 'transactions')
        ? transactionController.transactions
        : undefined;

    if (
      isPositiveMoneyBalance(lastKnownBalance) ||
      hasConfirmedMoneyDeposit(transactions)
    ) {
      return state;
    }

    state.user.moneySplashSeen = false;
  } catch (error) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Failed to reset moneySplashSeen: ${getErrorMessage(
          error,
        )}`,
      ),
    );
  }

  return state;
}
