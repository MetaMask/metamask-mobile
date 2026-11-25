import { captureException } from '@sentry/react-native';
import { hasProperty, isObject } from '@metamask/utils';
import { ensureValidState } from './util';

/**
 * Migration 158: backfill the `defaultMoneyAccountId` state field introduced
 * with `@metamask/money-account-controller@3.0.0`.
 *
 * The controller sets `defaultMoneyAccountId` when it creates a money
 * account (defaulting to the first one created). Wallets that already have a
 * money account never create another — `createMoneyAccount` returns the
 * existing account idempotently — so without this migration the default stays
 * `null` forever for them, and `getMoneyAccount()` with no selector, which
 * resolves the default account, returns `undefined`.
 *
 * A wallet can hold at most one money account today (the SFA account for the
 * primary entropy source), so when exactly one account exists its ID becomes
 * the default. Wallets with no account — or more than one, which cannot occur
 * today — keep the default unset; the controller fills it in on the next
 * account creation.
 */
export const migrationVersion = 158;

interface MoneyAccountControllerLike {
  moneyAccounts?: unknown;
  defaultMoneyAccountId?: unknown;
}

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

  const { moneyAccounts, defaultMoneyAccountId } = moneyAccountController;

  if (!isObject(moneyAccounts)) {
    captureException(
      new Error(
        `Migration ${migrationVersion}: Invalid moneyAccounts state: '${typeof moneyAccounts}'`,
      ),
    );
    return state;
  }

  const accountIds = Object.keys(moneyAccounts);

  // Leave any existing default — or a state with no account or more than one
  // (which cannot occur today) — untouched; the controller decides the default
  // on the next account creation.
  if (defaultMoneyAccountId || accountIds.length !== 1) {
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
          defaultMoneyAccountId: accountIds[0],
        },
      },
    },
  };
}
