import type { AnyAction } from 'redux';
import type { ThunkAction } from 'redux-thunk';
import type { Hex } from '@metamask/utils';
import type { RootState } from '../../reducers';
import { selectPrimaryMoneyAccount } from '../../selectors/moneyAccountController';
import Engine from '../../core/Engine';
import Logger from '../../util/Logger';
import ToastService from '../../core/ToastService';
import { ToastVariants } from '../../component-library/components/Toast/Toast.types';

const LOG_PREFIX = '[upgradeMoneyAccount]';

const showToast = (label: string, description?: string) => {
  try {
    ToastService.showToast({
      variant: ToastVariants.Plain,
      labelOptions: [{ label, isBold: true }],
      descriptionOptions: description ? { description } : undefined,
      hasNoTimeout: false,
    });
  } catch {
    // catch error In case the Toast ref isn't mounted yet (e.g. during early navigation).
  }
};

export const upgradeMoneyAccount =
  (): ThunkAction<void, RootState, unknown, AnyAction> =>
  (_dispatch, getState) => {
    const address = selectPrimaryMoneyAccount(getState())?.address as
      | Hex
      | undefined;
    if (!address) {
      Logger.log(LOG_PREFIX, 'no primary money account; skipping');
      return;
    }

    Logger.log(LOG_PREFIX, 'firing upgradeAccount', { address });

    // TODO: remove this toast before general release. It only exists to make it
    // clear what's happening in testing
    showToast('Upgrading money account…', address);

    Engine.context.MoneyAccountUpgradeController.upgradeAccount(address)
      .then(() => {
        Logger.log(LOG_PREFIX, 'upgradeAccount resolved', { address });
        showToast('Money account upgrade complete');
      })
      .catch((error: unknown) => {
        Logger.error(error as Error, `${LOG_PREFIX} failed`);
        const message =
          error instanceof Error ? error.message : 'Unknown error';
        showToast('Money account upgrade failed', message);
      });
  };
