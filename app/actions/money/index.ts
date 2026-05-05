import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';

const LOG_PREFIX = '[upgradeMoneyAccount]';

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
      .then(() =>
        Engine.context.MoneyAccountUpgradeController.upgradeAccount(address),
      )
      .catch((error: unknown) => {
        const wrapped =
          error instanceof Error ? error : new Error(String(error));
        Logger.error(wrapped, `${LOG_PREFIX} failed`);
      })
      .finally(() => {
        upgradesInFlight.delete(address);
      });
  };
