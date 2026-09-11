import { useMemo, useRef } from 'react';
import { usePredictPrices } from '../../../hooks/usePredictPrices';
import { useLiveMarketPrices } from '../../../hooks/useLiveMarketPrices';
import { getPredictBuyPrice, getPredictMidPrice } from '../../../utils/prices';
import {
  OPEN_PREDICT_OUTCOME_STATUS,
  type PriceQuery,
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

const EMPTY_PRICE_QUERIES: PriceQuery[] = [];

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

  const shouldFetchPrices = enabled && priceQueries.length > 0;
  const activePriceQueries = shouldFetchPrices
    ? priceQueries
    : EMPTY_PRICE_QUERIES;

  const tokenIds = useMemo(
    () => activePriceQueries.map((q) => q.outcomeTokenId),
    [activePriceQueries],
  );
  const { getPrice: getLivePrice, isConnected: isLiveConnected } =
    useLiveMarketPrices(tokenIds, {
      enabled: shouldFetchPrices,
    });

  // The live WebSocket feed is the primary source of truth for prices. Keep
  // REST enabled for initial/retained fallback data, but only poll while the
  // WebSocket is unavailable.
  const { prices } = usePredictPrices({
    queries: activePriceQueries,
    enabled: shouldFetchPrices,
    pollingInterval: shouldFetchPrices
      ? isLiveConnected
        ? undefined
        : 2000
      : undefined,
  });

  const previousOpenOutcomesRef = useRef<PredictOutcome[]>([]);
  const previousOpenOutcomesBaseRef = useRef<PredictOutcome[] | null>(null);

  // Two distinct prices per token:
  //   price    = mid = implied probability / odds (shown as "% chance").
  //   buyPrice = best ask = what you pay to buy (shown on the BUY CTA).
  // These diverge sharply on wide-spread (illiquid) markets, so they must be
  // sourced separately. Mid precedence: live mid > REST mid > base market price.
  // Ask precedence: live bestAsk > REST ask > base market price.
  //
  // Identity preservation: rebuilding every outcome/token object on each price
  // tick gives all of them new references, which forces every (memoized) row to
  // re-render even when only one token's price changed. Here we reuse the
  // previous token/outcome object whenever the computed prices are unchanged, so
  // only the rows that actually changed get a new reference. When the base
  // market data changes (different array identity), we rebuild from scratch.
  const openOutcomes = useMemo(() => {
    const baseUnchanged =
      previousOpenOutcomesBaseRef.current === openOutcomesBase;
    const previousById = baseUnchanged
      ? new Map(previousOpenOutcomesRef.current.map((o) => [o.id, o]))
      : undefined;

    const next = openOutcomesBase.map((outcome) => {
      const previousOutcome = previousById?.get(outcome.id);
      let changed = !previousOutcome;

      const tokens = outcome.tokens.map((token) => {
        const livePrice = getLivePrice(token.id);
        const price =
          getPredictMidPrice(token, livePrice, prices) ?? token.price;
        const buyPrice =
          getPredictBuyPrice(token, livePrice, prices) ?? token.price;
        const previousToken = previousOutcome?.tokens.find(
          (t) => t.id === token.id,
        );
        if (
          previousToken &&
          previousToken.price === price &&
          previousToken.buyPrice === buyPrice
        ) {
          return previousToken;
        }
        changed = true;
        return { ...token, price, buyPrice };
      });

      if (previousOutcome && !changed) {
        return previousOutcome;
      }
      return { ...outcome, tokens };
    });

    previousOpenOutcomesRef.current = next;
    previousOpenOutcomesBaseRef.current = openOutcomesBase;
    return next;
  }, [openOutcomesBase, prices, getLivePrice]);

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
