import { queryOptions } from '@tanstack/react-query';
import { CardSDK } from '../sdk/CardSDK';
import type {
  CashbackWalletResponse,
  CashbackWithdrawEstimationResponse,
} from '../types';

export const cashbackKeys = {
  all: () => ['card', 'cashback'] as const,
  wallet: () => [...cashbackKeys.all(), 'wallet'] as const,
  withdrawEstimation: () =>
    [...cashbackKeys.all(), 'withdraw-estimation'] as const,
};

export const cashbackWalletOptions = (sdk: CardSDK | null) =>
  queryOptions({
    queryKey: cashbackKeys.wallet(),
    queryFn: async (): Promise<CashbackWalletResponse> => {
      if (!sdk) throw new Error('CardSDK not available');
      return sdk.getCashbackWallet();
    },
    enabled: !!sdk,
    staleTime: 0,
  });

export const cashbackWithdrawEstimationOptions = (sdk: CardSDK | null) =>
  queryOptions({
    queryKey: cashbackKeys.withdrawEstimation(),
    queryFn: async (): Promise<CashbackWithdrawEstimationResponse> => {
      if (!sdk) throw new Error('CardSDK not available');
      return sdk.getCashbackWithdrawEstimation();
    },
    enabled: false,
    staleTime: 0,
  });
