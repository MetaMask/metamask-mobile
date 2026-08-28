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
    providerUserId: string,
    fromDate?: number,
    toDate?: number,
  ) =>
    [
      ...transactionKeys.all(),
      providerId,
      providerUserId,
      fromDate,
      toDate,
    ] as const,
  /** Bounded Money Account enrichment index; scoped per provider/user. */
  index: (providerId: string | null, providerUserId: string) =>
    [...transactionKeys.all(), 'index', providerId, providerUserId] as const,
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
