import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type {
  CreditWalletResponse,
  CreditWithdrawEstimationResponse,
} from '../../../../core/Engine/controllers/card-controller/provider-types';

export const creditKeys = {
  all: () => ['card', 'credit'] as const,
  wallet: () => [...creditKeys.all(), 'wallet'] as const,
  withdrawEstimation: () =>
    [...creditKeys.all(), 'withdraw-estimation'] as const,
};

export const creditWalletOptions = () =>
  queryOptions({
    queryKey: creditKeys.wallet(),
    queryFn: async (): Promise<CreditWalletResponse> =>
      Engine.context.CardController.getCreditWallet(),
    staleTime: 0,
  });

export const creditWithdrawEstimationOptions = () =>
  queryOptions({
    queryKey: creditKeys.withdrawEstimation(),
    queryFn: async (): Promise<CreditWithdrawEstimationResponse> =>
      Engine.context.CardController.getCreditWithdrawEstimation(),
    enabled: false,
    staleTime: 0,
  });
