import {
  Side,
  type GetPriceResponse,
  type PredictOutcomeToken,
  type PriceUpdate,
} from '../types';
import {
  getDisplayBuyPrice,
  getPredictBuyPrice,
  getPredictMidPrice,
  getPredictTicksWorse,
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

describe('getPredictTicksWorse', () => {
  it('returns 0 for a better price on a sell', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.68,
        tickSize: 0.01,
      }),
    ).toBe(0);
  });

  it('returns 0 for an equal price', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.65,
        tickSize: 0.01,
      }),
    ).toBe(0);
  });

  it('counts whole ticks worse for a sell', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.62,
        tickSize: 0.01,
      }),
    ).toBe(3);
  });

  it('counts exactly one tick as one', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.64,
        tickSize: 0.01,
      }),
    ).toBe(1);
  });

  it('treats a lower price as better for a buy', () => {
    expect(
      getPredictTicksWorse({
        side: Side.BUY,
        referencePrice: 0.6,
        freshPrice: 0.58,
        tickSize: 0.01,
      }),
    ).toBe(0);
  });

  it('counts a higher price as worse for a buy', () => {
    expect(
      getPredictTicksWorse({
        side: Side.BUY,
        referencePrice: 0.6,
        freshPrice: 0.63,
        tickSize: 0.01,
      }),
    ).toBe(3);
  });

  it('measures with the provided tick size, not a hardcoded cent', () => {
    // Finer book: 2 ticks of 0.001 would be 0 with a hardcoded $0.01.
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.1,
        freshPrice: 0.098,
        tickSize: 0.001,
      }),
    ).toBe(2);
  });

  it('rounds down partial ticks', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.6399,
        tickSize: 0.01,
      }),
    ).toBe(1);
  });

  it('returns 0 for a non-positive tick size', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: 0.65,
        freshPrice: 0.62,
        tickSize: 0,
      }),
    ).toBe(0);
  });

  it('returns 0 for invalid prices', () => {
    expect(
      getPredictTicksWorse({
        side: Side.SELL,
        referencePrice: Number.NaN,
        freshPrice: 0.62,
        tickSize: 0.01,
      }),
    ).toBe(0);
  });
});
