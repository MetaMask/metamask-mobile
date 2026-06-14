import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceUpdate,
} from '../types';
import { getPredictBuyPrice } from './prices';

const token: PredictOutcomeToken = {
  id: 'token-1',
  title: 'Up',
  price: 0.51,
};

const createRestPrices = (buy: number, sell: number): GetPriceResponse => ({
  providerId: 'polymarket',
  results: [
    {
      marketId: 'market-1',
      outcomeId: 'outcome-1',
      outcomeTokenId: 'token-1',
      entry: { buy, sell },
    },
  ],
});

const livePrice: PriceUpdate = {
  tokenId: 'token-1',
  price: 0.7,
  bestBid: 0.69,
  bestAsk: 0.71,
};

describe('getPredictBuyPrice', () => {
  it('prefers the live WebSocket best ask for buy CTAs', () => {
    expect(
      getPredictBuyPrice(token, livePrice, createRestPrices(0.6, 0.4)),
    ).toBe(0.71);
  });

  it('falls back to the REST buy price, not the sell price', () => {
    expect(
      getPredictBuyPrice(token, undefined, createRestPrices(0.62, 0.38)),
    ).toBe(0.62);
  });

  it('falls back to the static token price when no live or REST buy price exists', () => {
    expect(
      getPredictBuyPrice(token, undefined, createRestPrices(0, 0.38)),
    ).toBe(0.51);
  });
});
