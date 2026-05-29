import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import { whenMoneyAccountUpgradeReady } from '../../core/Engine/controllers/money-account-upgrade-controller-init';
import {
  __resetMoneyAccountUpgradeRunnerForTesting,
  runMoneyAccountUpgrade,
} from '../../core/Engine/controllers/money-account-upgrade-controller-runner';

const LOG_PREFIX = '[upgradeMoneyAccount]';

/** @internal For test use only. */
export const __resetUpgradesInFlightForTesting = () => {
  __resetMoneyAccountUpgradeRunnerForTesting();
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

    const { promise, reused } = runMoneyAccountUpgrade({
      address,
      upgradeAccount: async (upgradeAddress) => {
        await whenMoneyAccountUpgradeReady();
        await Engine.context.MoneyAccountUpgradeController.upgradeAccount(
          upgradeAddress,
        );
      },
    });

    if (reused) {
      Logger.log(LOG_PREFIX, 'upgrade already in flight; skipping', {
        address,
      });
      return;
    }

    promise.catch((error: unknown) => {
      const wrapped = error instanceof Error ? error : new Error(String(error));
      Logger.error(wrapped, `${LOG_PREFIX} failed`);
    });
  };
