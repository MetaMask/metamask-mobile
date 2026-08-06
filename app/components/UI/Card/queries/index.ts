import { pinKeys } from './pin';
import {
  cashbackKeys,
  cashbackWalletOptions,
  cashbackWithdrawEstimationOptions,
} from './cashback';
import {
  creditKeys,
  creditWalletOptions,
  creditWithdrawEstimationOptions,
} from './credit';
import { dashboardKeys } from './dashboard';
import { authKeys } from './auth';

const transactionKeys = {
  all: () => ['card', 'transactions'] as const,
  list: (
    providerId: string | null,
    authSessionId: string | null,
    searchQuery: string,
    fromDate?: number,
    toDate?: number,
  ) =>
    [
      ...transactionKeys.all(),
      providerId,
      authSessionId,
      searchQuery,
      fromDate,
      toDate,
    ] as const,
};

export const cardQueries = {
  keys: {
    all: () => ['card'] as const,
  },
  dashboard: {
    keys: dashboardKeys,
  },
  pin: {
    keys: pinKeys,
  },
  cashback: {
    keys: cashbackKeys,
    walletOptions: cashbackWalletOptions,
    withdrawEstimationOptions: cashbackWithdrawEstimationOptions,
  },
  credit: {
    keys: creditKeys,
    walletOptions: creditWalletOptions,
    withdrawEstimationOptions: creditWithdrawEstimationOptions,
  },
  auth: {
    keys: authKeys,
  },
  transactions: {
    keys: transactionKeys,
  },
};
