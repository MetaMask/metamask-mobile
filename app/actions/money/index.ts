import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import { type Hex, isStrictHexString } from '@metamask/utils';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import ToastService from '../../core/ToastService';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';

const LOG_PREFIX = '[upgradeMoneyAccount]';

const upgradesInFlight = new Set<Hex>();

/** @internal For test use only. */
export const __resetUpgradesInFlightForTesting = () => {
  upgradesInFlight.clear();
};

const showToast = (label: string, description?: string) => {
  if (!ToastService.toastRef?.current) {
    return;
  }
  ToastService.showToast({
    variant: ToastVariants.Plain,
    labelOptions: [{ label, isBold: true }],
    descriptionOptions: description ? { description } : undefined,
    hasNoTimeout: false,
  });
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

    Logger.log(LOG_PREFIX, 'firing upgradeAccount', { address });

    // TODO: remove this toast before general release. It only exists to make it
    // clear what's happening in testing
    showToast('Upgrading money account…', address);

    upgradesInFlight.add(address);
    Engine.context.MoneyAccountUpgradeController.upgradeAccount(address)
      .then(() => {
        Logger.log(LOG_PREFIX, 'upgradeAccount resolved', { address });
        showToast('Money account upgrade complete');
      })
      .catch((error: unknown) => {
        if (error instanceof Error) {
          Logger.error(error, `${LOG_PREFIX} failed`);
          showToast('Money account upgrade failed', error.message);
        } else {
          Logger.error(new Error(String(error)), `${LOG_PREFIX} failed`);
          showToast('Money account upgrade failed', 'Unknown error');
        }
      })
      .finally(() => {
        upgradesInFlight.delete(address);
      });
  };
