import { pinKeys, pinTokenMutationFn } from './pin';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';
import { dashboardKeys } from './dashboard';
import { authKeys } from './auth';

export const cardQueries = {
  keys: {
    all: () => ['card'] as const,
  },
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
  auth: {
    keys: authKeys,
  },
};
