import { pinKeys, pinTokenMutationFn } from './pin';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';
export const cardQueries = {
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
