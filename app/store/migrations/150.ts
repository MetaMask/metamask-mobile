import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

export const migrationVersion = 150;

const ETH_SIGN_TRANSACTION_METHOD = 'eth_signTransaction';

interface MoneyAccountLike {
  methods?: unknown;
}

interface MoneyAccountControllerLike {
  moneyAccounts?: unknown;
}

/**
 * Migration 150: Remove `eth_signTransaction` from persisted money accounts.
 *
 * Money accounts no longer expose transaction signing; existing persisted state
 * must be updated so account capabilities match the controller.
 *
 * @param state - The persisted Redux state.
 * @returns The migrated Redux state.
 */
export default function migrate(state: unknown): unknown {
  if (!ensureValidState(state, migrationVersion)) {
    return state;
  }

  const moneyAccountController = state.engine.backgroundState
    .MoneyAccountController as MoneyAccountControllerLike | undefined;

  if (moneyAccountController === undefined) {
    return state;
  }

  if (!isObject(moneyAccountController)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid MoneyAccountController state: '${typeof moneyAccountController}'`,
      ),
    );
    return state;
  }

  if (!hasProperty(moneyAccountController, 'moneyAccounts')) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Missing moneyAccounts property from MoneyAccountController`,
      ),
    );
    return state;
  }

  const { moneyAccounts } = moneyAccountController;

  if (!isObject(moneyAccounts)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid moneyAccounts state: '${typeof moneyAccounts}'`,
      ),
    );
    return state;
  }

  let didUpdate = false;
  const updatedMoneyAccounts = Object.fromEntries(
    Object.entries(moneyAccounts).map(([accountId, account]) => {
      if (!isObject(account)) {
        return [accountId, account];
      }

      const moneyAccount = account as MoneyAccountLike;

      if (!Array.isArray(moneyAccount.methods)) {
        return [accountId, account];
      }

      const updatedMethods = moneyAccount.methods.filter(
        (method) => method !== ETH_SIGN_TRANSACTION_METHOD,
      );

      if (updatedMethods.length === moneyAccount.methods.length) {
        return [accountId, account];
      }

      didUpdate = true;
      return [
        accountId,
        {
          ...moneyAccount,
          methods: updatedMethods,
        },
      ];
    }),
  );

  if (!didUpdate) {
    return state;
  }

  return {
    ...state,
    engine: {
      ...state.engine,
      backgroundState: {
        ...state.engine.backgroundState,
        MoneyAccountController: {
          ...moneyAccountController,
          moneyAccounts: updatedMoneyAccounts,
        },
      },
    },
  };
}
