import { useCallback, useState } from 'react';
import type {
  PredictMarket,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../Predict/types';
import { interpolateFirstPredictOnUsTradeDescription } from '../components/FirstPredictOnUs/constants';
import useRewardsToast from './useRewardsToast';

export interface FirstPredictOnUsOrderParams {
  amountUsd: number;
  market: PredictMarket;
  outcome: PredictOutcome;
  outcomeToken: PredictOutcomeToken;
  tradeDescriptionTemplate: string;
  tradePlacedLabel: string;
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
    async ({
      amountUsd,
      outcomeToken,
      tradeDescriptionTemplate,
      tradePlacedLabel,
    }: FirstPredictOnUsOrderParams) => {
      setIsLoading(true);
      setError(null);

      try {
        showToast(
          RewardsToastOptions.success(
            tradePlacedLabel,
            interpolateFirstPredictOnUsTradeDescription(
              tradeDescriptionTemplate,
              `$${amountUsd.toFixed(2)}`,
              outcomeToken.title,
            ),
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
