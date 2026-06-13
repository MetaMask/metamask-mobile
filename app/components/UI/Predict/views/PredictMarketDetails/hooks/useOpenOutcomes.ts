import { useMemo } from 'react';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PredictMarket,
  type PredictOutcome,
} from '../../../types';

interface UseOpenOutcomesParams {
  market: PredictMarket | null;
}

interface UseOpenOutcomesResult {
  closedOutcomes: PredictOutcome[];
  openOutcomes: PredictOutcome[];
  yesPercentage: number;
}

export const useOpenOutcomes = ({
  market,
}: UseOpenOutcomesParams): UseOpenOutcomesResult => {
  const closedOutcomes = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'closed') ?? [],
    [market?.outcomes],
  );
  const openOutcomesBase = useMemo(
    () =>
      market?.outcomes?.filter(
        (outcome) => outcome.status === OPEN_PREDICT_OUTCOME_STATUS,
      ) ?? [],
    [market?.outcomes],
  );

  const yesPercentage = useMemo((): number => {
    const firstOpenOutcome = openOutcomesBase[0];
    const firstTokenPrice = firstOpenOutcome?.tokens?.[0]?.price;

    if (typeof firstTokenPrice === 'number') {
      return Math.round(firstTokenPrice * 100);
    }

    // Fallback to original market data
    const firstOutcomePrice = market?.outcomes?.[0]?.tokens?.[0]?.price;
    if (typeof firstOutcomePrice === 'number') {
      return Math.round(firstOutcomePrice * 100);
    }
    return 0;
  }, [market?.outcomes, openOutcomesBase]);

  return {
    closedOutcomes,
    openOutcomes: openOutcomesBase,
    yesPercentage,
  };
};
