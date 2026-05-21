import { useMemo } from 'react';
import { usePredictPrices } from '../../../hooks/usePredictPrices';
import { useLiveMarketPrices } from '../../../hooks/useLiveMarketPrices';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PriceQuery,
  type PredictMarket,
  type PredictOutcome,
} from '../../../types';

interface UseOpenOutcomesParams {
  market: PredictMarket | null;
  isMarketFetching: boolean;
}

interface UseOpenOutcomesResult {
  closedOutcomes: PredictOutcome[];
  openOutcomes: PredictOutcome[];
  yesPercentage: number;
}

export const useOpenOutcomes = ({
  market,
  isMarketFetching,
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

  const priceQueries: PriceQuery[] = useMemo(
    () =>
      openOutcomesBase.flatMap((outcome) =>
        outcome.tokens.map((token) => ({
          marketId: outcome.marketId,
          outcomeId: outcome.id,
          outcomeTokenId: token.id,
        })),
      ),
    [openOutcomesBase],
  );

  const { prices } = usePredictPrices({
    queries: priceQueries,
    enabled: !isMarketFetching && priceQueries.length > 0,
  });

  const tokenIds = useMemo(
    () => priceQueries.map((q) => q.outcomeTokenId),
    [priceQueries],
  );
  const { getPrice: getLivePrice } = useLiveMarketPrices(tokenIds, {
    enabled: !isMarketFetching && tokenIds.length > 0,
  });

  // Price precedence: live WebSocket bestAsk > REST entry.sell > base market price.
  const openOutcomes = useMemo(
    () =>
      openOutcomesBase.map((outcome) => ({
        ...outcome,
        tokens: outcome.tokens.map((token) => {
          const liveBestAsk = getLivePrice(token.id)?.bestAsk;
          if (typeof liveBestAsk === 'number' && liveBestAsk > 0) {
            return { ...token, price: liveBestAsk };
          }

          const priceResult = prices.results.find(
            (r) => r.outcomeTokenId === token.id,
          );
          const realTimePrice = priceResult?.entry.sell;
          return {
            ...token,
            price: realTimePrice ?? token.price,
          };
        }),
      })),
    [openOutcomesBase, prices, getLivePrice],
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
