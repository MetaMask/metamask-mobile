import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceUpdate,
} from '../types';

const isValidPrice = (price: number | undefined): price is number =>
  typeof price === 'number' && Number.isFinite(price) && price > 0;

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
