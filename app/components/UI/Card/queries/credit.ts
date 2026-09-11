import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type {
  CreditWalletResponse,
  CreditWithdrawEstimationResponse,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  REDEEM_STALE_TIME_MS,
  shouldRetryRedeemQuery,
} from './redeemQueryDefaults';

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
    staleTime: REDEEM_STALE_TIME_MS,
    retry: shouldRetryRedeemQuery,
  });

export const creditWithdrawEstimationOptions = () =>
  queryOptions({
    queryKey: creditKeys.withdrawEstimation(),
    queryFn: async (): Promise<CreditWithdrawEstimationResponse> =>
      Engine.context.CardController.getCreditWithdrawEstimation(),
    enabled: false,
    staleTime: REDEEM_STALE_TIME_MS,
    retry: shouldRetryRedeemQuery,
  });
