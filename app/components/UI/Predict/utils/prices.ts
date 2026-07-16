import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceUpdate,
} from '../types';

export const isValidPrice = (price: number | undefined): price is number =>
  typeof price === 'number' && Number.isFinite(price) && price > 0;

/**
 * Live odds-oriented price from a WS tick.
 *
 * Prefer the mid-price (`(bid + ask) / 2`) to mirror implied probability shown
 * in charts/odds labels. If one side is temporarily missing, fall back to the
 * trade price field.
 */
export const getLiveMidPrice = (
  livePrice: PriceUpdate | undefined,
): number | undefined => {
  if (isValidPrice(livePrice?.bestBid) && isValidPrice(livePrice?.bestAsk)) {
    return (livePrice.bestBid + livePrice.bestAsk) / 2;
  }

  return isValidPrice(livePrice?.price) ? livePrice.price : undefined;
};

/**
 * Price to display on a BUY CTA from an already-priced token: the best ask
 * (`buyPrice`) when present, otherwise the token's mid `price`. Use this for
 * any "what you pay to buy" label so it never falls back to the odds mid on a
 * wide-spread market.
 */
export const getDisplayBuyPrice = (
  token: PredictOutcomeToken | undefined,
): number | undefined => token?.buyPrice ?? token?.price;

/**
 * Price to display on a BUY CTA: the best ask (what the user actually pays).
 * Precedence: live WS best ask > REST ask (`entry.buy`) > static token price.
 */
export const getPredictBuyPrice = (
  token: PredictOutcomeToken | undefined,
  livePrice: PriceUpdate | undefined,
  restPrices: GetPriceResponse,
): number | undefined => {
  if (!token) {
    return undefined;
  }

  if (isValidPrice(livePrice?.bestAsk)) {
    return livePrice.bestAsk;
  }

  const restEntry = restPrices.results.find(
    (result) => result.outcomeTokenId === token.id,
  );
  if (isValidPrice(restEntry?.entry.buy)) {
    return restEntry.entry.buy;
  }

  return isValidPrice(token.price) ? token.price : undefined;
};

/**
 * Mid price = the implied probability / quoted odds, i.e. `(bid + ask) / 2`.
 * This is what should be shown as the outcome's "% chance" / odds, matching the
 * chart and Polymarket. Distinct from {@link getPredictBuyPrice}, which is a
 * tradeable price. On a wide-spread (illiquid) market the bid, mid and ask
 * diverge sharply, so the odds must use the mid - not a tradeable side.
 * Precedence: live WS mid > REST mid > static token price.
 */
export const getPredictMidPrice = (
  token: PredictOutcomeToken | undefined,
  livePrice: PriceUpdate | undefined,
  restPrices: GetPriceResponse,
): number | undefined => {
  if (!token) {
    return undefined;
  }

  if (isValidPrice(livePrice?.bestBid) && isValidPrice(livePrice?.bestAsk)) {
    return (livePrice.bestBid + livePrice.bestAsk) / 2;
  }

  const restEntry = restPrices.results.find(
    (result) => result.outcomeTokenId === token.id,
  );
  // entry.buy = ask, entry.sell = bid (see PolymarketProvider.getPrices).
  if (
    isValidPrice(restEntry?.entry.buy) &&
    isValidPrice(restEntry?.entry.sell)
  ) {
    return (restEntry.entry.buy + restEntry.entry.sell) / 2;
  }

  return isValidPrice(token.price) ? token.price : undefined;
};
