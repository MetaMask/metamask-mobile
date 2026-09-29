import type {
  GetPriceResponse,
  PredictOutcomeToken,
  PriceUpdate,
} from '../types';
import {
  getDisplayBuyPrice,
  getPredictBuyPrice,
  getPredictMidPrice,
} from './prices';

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

describe('getPredictMidPrice', () => {
  it('prefers the live mid (bestBid + bestAsk) / 2 for odds', () => {
    // bestBid 0.69, bestAsk 0.71 -> mid 0.70
    expect(
      getPredictMidPrice(token, livePrice, createRestPrices(0.9, 0.1)),
    ).toBeCloseTo(0.7);
  });

  it('falls back to the REST mid (ask + bid) / 2 when live prices are missing', () => {
    // entry.buy = ask = 0.92, entry.sell = bid = 0.34 -> mid 0.63 (Almeria case)
    expect(
      getPredictMidPrice(token, undefined, createRestPrices(0.92, 0.34)),
    ).toBeCloseTo(0.63);
  });

  it('does not return a tradeable side as the mid', () => {
    const mid = getPredictMidPrice(
      token,
      undefined,
      createRestPrices(0.92, 0.34),
    );
    expect(mid).not.toBe(0.92); // not the ask
    expect(mid).not.toBe(0.34); // not the bid
  });

  it('falls back to the static token price when a full book is unavailable', () => {
    // Only one side present -> cannot compute a mid -> use token.price.
    expect(
      getPredictMidPrice(token, undefined, createRestPrices(0.92, 0)),
    ).toBe(0.51);
  });

  it('returns undefined when no token is provided', () => {
    expect(
      getPredictMidPrice(undefined, livePrice, createRestPrices(0.9, 0.1)),
    ).toBeUndefined();
  });

  it('ignores a one-sided live book and uses the REST mid instead', () => {
    // Live has only a valid ask (no bid) -> skip live mid, use REST mid 0.5.
    const oneSidedLive: PriceUpdate = {
      tokenId: 'token-1',
      price: 0.7,
      bestBid: 0,
      bestAsk: 0.71,
    };
    expect(
      getPredictMidPrice(token, oneSidedLive, createRestPrices(0.6, 0.4)),
    ).toBeCloseTo(0.5);
  });
});

describe('getDisplayBuyPrice', () => {
  it('returns the ask (buyPrice) when present', () => {
    expect(getDisplayBuyPrice({ ...token, buyPrice: 0.92 })).toBe(0.92);
  });

  it('falls back to the mid price when buyPrice is absent', () => {
    expect(getDisplayBuyPrice(token)).toBe(0.51);
  });

  it('returns undefined for an undefined token', () => {
    expect(getDisplayBuyPrice(undefined)).toBeUndefined();
  });
});
