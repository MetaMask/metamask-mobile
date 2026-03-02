import { pinKeys, pinTokenMutationFn } from './pin';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';
import { dashboardKeys } from './dashboard';

export { cardKeys } from './keys';
export { dashboardKeys } from './dashboard';
export { cashbackKeys } from './cashback';

export const cardQueries = {
  dashboard: {
    keys: dashboardKeys,
  },
  pin: {
    keys: pinKeys,
    tokenMutationFn: pinTokenMutationFn,
  },
  cashback: {
    keys: cashbackKeys,
    walletOptions: cashbackWalletOptions,
    withdrawEstimationOptions: cashbackWithdrawEstimationOptions,
  },
};
