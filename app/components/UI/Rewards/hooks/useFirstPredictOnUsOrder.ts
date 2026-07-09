import { useCallback, useState } from 'react';
import { strings } from '../../../../../locales/i18n';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../Predict/types';
import useRewardsToast from './useRewardsToast';

export interface FirstPredictOnUsOrderParams {
  amountUsd: number;
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
}

interface UseFirstPredictOnUsOrderResult {
  error: Error | null;
  isLoading: boolean;
  submitOrder: (params: FirstPredictOnUsOrderParams) => Promise<void>;
}

export function useFirstPredictOnUsOrder(): UseFirstPredictOnUsOrderResult {
  const { RewardsToastOptions, showToast } = useRewardsToast();
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const submitOrder = useCallback(
    async ({ amountUsd, outcomeToken }: FirstPredictOnUsOrderParams) => {
      setIsLoading(true);
      setError(null);

      try {
        showToast(
          RewardsToastOptions.success(
            strings('rewards.first_predict_on_us.toast.trade_placed'),
            strings('rewards.first_predict_on_us.toast.bought', {
              amount: `$${amountUsd.toFixed(2)}`,
              outcome: outcomeToken.title,
            }),
          ),
        );
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err));
        setError(normalizedError);
        throw normalizedError;
      } finally {
        setIsLoading(false);
      }
    },
    [RewardsToastOptions, showToast],
  );

  return {
    error,
    isLoading,
    submitOrder,
  };
}
