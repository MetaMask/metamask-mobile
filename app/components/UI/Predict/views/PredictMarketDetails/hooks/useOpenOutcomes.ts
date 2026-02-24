import { useMemo } from 'react';
import { usePredictPrices } from '../../../hooks/usePredictPrices';
import type { PriceQuery, PredictMarket, PredictOutcome } from '../../../types';

interface UseOpenOutcomesParams {
  market: PredictMarket | null;
  providerId: string;
  isMarketFetching: boolean;
}

interface UseOpenOutcomesResult {
  closedOutcomes: PredictOutcome[];
  openOutcomes: PredictOutcome[];
  yesPercentage: number;
}

export const useOpenOutcomes = ({
  market,
  providerId,
  isMarketFetching,
}: UseOpenOutcomesParams): UseOpenOutcomesResult => {
  const closedOutcomes = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'closed') ?? [],
    [market?.outcomes],
  );
  const openOutcomesBase = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'open') ?? [],
    [market?.outcomes],
  );

  // build price queries for fetching prices
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

  // fetch real-time prices once after market loads
  const { prices } = usePredictPrices({
    queries: priceQueries,
    providerId,
    enabled: !isMarketFetching && priceQueries.length > 0,
  });

  // create open outcomes with updated prices from real-time data
  const openOutcomes = useMemo(() => {
    if (!prices.results.length) {
      return openOutcomesBase;
    }

    return openOutcomesBase.map((outcome) => ({
      ...outcome,
      tokens: outcome.tokens.map((token) => {
        const priceResult = prices.results.find(
          (r) => r.outcomeTokenId === token.id,
        );
        const realTimePrice = priceResult?.entry.sell;
        return {
          ...token,
          // use real-time (CLOB) price if available, otherwise keep existing price
          price: realTimePrice ?? token.price,
        };
      }),
    }));
  }, [openOutcomesBase, prices]);

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
