import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type {
  CashbackWalletResponse,
  CashbackWithdrawEstimationResponse,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export const cashbackKeys = {
  all: () => ['card', 'cashback'] as const,
  wallet: () => [...cashbackKeys.all(), 'wallet'] as const,
  withdrawEstimation: () =>
    [...cashbackKeys.all(), 'withdraw-estimation'] as const,
};

export const cashbackWalletOptions = () =>
  queryOptions({
    queryKey: cashbackKeys.wallet(),
    queryFn: async (): Promise<CashbackWalletResponse> =>
      Engine.context.CardController.getCashbackWallet(),
    staleTime: 0,
  });

export const cashbackWithdrawEstimationOptions = () =>
  queryOptions({
    queryKey: cashbackKeys.withdrawEstimation(),
    queryFn: async (): Promise<CashbackWithdrawEstimationResponse> =>
      Engine.context.CardController.getCashbackWithdrawEstimation(),
    enabled: false,
    staleTime: 0,
  });
