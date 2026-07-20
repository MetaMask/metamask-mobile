import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import { isMoneyAccountUpgradeStepError } from '@metamask/money-account-upgrade-controller';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';

const LOG_PREFIX = '[upgradeMoneyAccount]';

/** Sentry tag used to group/filter Money Account upgrade failures. */
const SENTRY_FEATURE_TAG = 'money-account-upgrade';

const upgradesInFlight = new Set<Hex>();

/** @internal For test use only. */
export const __resetUpgradesInFlightForTesting = () => {
  upgradesInFlight.clear();
};

export const upgradeMoneyAccount =
  (): ThunkAction<void, RootState, unknown, AnyAction> =>
  (_dispatch, getState) => {
    const address = selectPrimaryMoneyAccount(getState())?.address;
    if (!address || !isStrictHexString(address)) {
      Logger.log(LOG_PREFIX, 'no valid primary money account; skipping', {
        address,
      });
      return;
    }

    if (upgradesInFlight.has(address)) {
      Logger.log(LOG_PREFIX, 'upgrade already in flight; skipping', {
        address,
      });
      return;
    }

    upgradesInFlight.add(address);
    whenMoneyAccountUpgradeReady()
      .then(
        () =>
          Engine.context.MoneyAccountUpgradeController.upgradeAccount(address),
        (error: unknown) => {
          // The controller isn't ready: the feature flag is off, the keyring
          // is locked, or bootstrap failed. "Not ready" is a normal state, and
          // bootstrap failures are already reported to Sentry by the
          // controller-init module — so we skip quietly here rather than
          // double-reporting a Sentry error.
          Logger.log(LOG_PREFIX, 'upgrade controller not ready; skipping', {
            address,
            reason: error instanceof Error ? error.message : String(error),
          });
        },
      )
      .catch((error: unknown) => {
        // Reached only for errors thrown by upgradeAccount itself.
        const wrapped =
          error instanceof Error ? error : new Error(String(error));
        const step = isMoneyAccountUpgradeStepError(error)
          ? error.step
          : undefined;
        Logger.error(wrapped, {
          tags: {
            feature: SENTRY_FEATURE_TAG,
            ...(step ? { step } : {}),
          },
          context: {
            name: 'money_account_upgrade',
            data: { phase: 'upgrade', ...(step ? { step } : {}) },
          },
        });
      })
      .finally(() => {
        upgradesInFlight.delete(address);
      });
  };
