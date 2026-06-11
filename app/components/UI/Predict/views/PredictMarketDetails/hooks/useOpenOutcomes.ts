import { useMemo } from 'react';
import { useLiveMarketPrices } from '../../../hooks/useLiveMarketPrices';
import { isValidPrice } from '../../../utils/prices';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PredictMarket,
  type PredictOutcome,
} from '../../../types';

interface UseOpenOutcomesParams {
  market: PredictMarket | null;
  enabled?: boolean;
}

interface UseOpenOutcomesResult {
  closedOutcomes: PredictOutcome[];
  openOutcomes: PredictOutcome[];
  yesPercentage: number;
}

const EMPTY_TOKEN_IDS: string[] = [];

export const useOpenOutcomes = ({
  market,
  enabled = true,
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

  const tokenIds = useMemo(
    () =>
      openOutcomesBase.flatMap((outcome) => outcome.tokens.map((t) => t.id)),
    [openOutcomesBase],
  );

  const shouldSubscribe = enabled && tokenIds.length > 0;
  const activeTokenIds = shouldSubscribe ? tokenIds : EMPTY_TOKEN_IDS;

  const { getPrice: getLivePrice } = useLiveMarketPrices(activeTokenIds, {
    enabled: shouldSubscribe,
  });

  // Price precedence: live WebSocket bestAsk > base market price.
  const openOutcomes = useMemo(
    () =>
      openOutcomesBase.map((outcome) => ({
        ...outcome,
        tokens: outcome.tokens.map((token) => ({
          ...token,
          price: (() => {
            const liveBestAsk = getLivePrice(token.id)?.bestAsk;
            return isValidPrice(liveBestAsk) ? liveBestAsk : token.price;
          })(),
        })),
      })),
    [openOutcomesBase, getLivePrice],
  );

  const yesPercentage = useMemo((): number => {
    // Use real-time price if available from open outcomes
    const firstOpenOutcome = openOutcomes[0];
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
  }, [market?.outcomes, openOutcomes]);

  return {
    closedOutcomes,
    openOutcomes,
    yesPercentage,
  };
};
