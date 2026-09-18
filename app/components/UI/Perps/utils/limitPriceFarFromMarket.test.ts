import { LIMIT_PRICE_CONFIG } from '../constants/perpsConfig';
import {
  getFarthestRestingLimitPrice,
  getLimitPriceDirectionWarning,
  getLimitPriceFarFromMarketWarning,
} from './limitPriceFarFromMarket';

const mockStrings = jest.fn(
  (key: string, _params?: Record<string, unknown>) => key,
);

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) =>
    mockStrings(key, params),
}));

describe('getFarthestRestingLimitPrice', () => {
  it('returns the limit price for a limit order', () => {
    expect(
      getFarthestRestingLimitPrice({
        orderType: 'limit',
        direction: 'long',
        limitPrice: '2400',
      }),
    ).toBe(2400);
  });

  it('returns the lower endpoint for a long scale', () => {
    expect(
      getFarthestRestingLimitPrice({
        orderType: 'scale',
        direction: 'long',
        startPrice: '2600',
        endPrice: '2100',
      }),
    ).toBe(2100);
  });

  it('returns the higher endpoint for a short scale', () => {
    expect(
      getFarthestRestingLimitPrice({
        orderType: 'scale',
        direction: 'short',
        startPrice: '2600',
        endPrice: '2100',
      }),
    ).toBe(2600);
  });

  it('returns undefined when a scale endpoint is missing', () => {
    expect(
      getFarthestRestingLimitPrice({
        orderType: 'scale',
        direction: 'long',
        startPrice: '2100',
      }),
    ).toBeUndefined();
  });
});

describe('getLimitPriceFarFromMarketWarning', () => {
  const bid = 10000;
  const ask = 10010;

  it('warns when a long limit is more than 5% below the best bid', () => {
    expect(
      getLimitPriceFarFromMarketWarning({
        orderType: 'limit',
        direction: 'long',
        reduceOnly: false,
        limitPrice: '9000',
        bestBid: bid,
        bestAsk: ask,
      }),
    ).toBe('perps.order.validation.limit_price_far_from_market_bid');
  });

  it('stays quiet at exactly the 5% long threshold', () => {
    const limitPrice = String(
      bid * (1 - LIMIT_PRICE_CONFIG.FarFromMarketThreshold),
    );

    expect(
      getLimitPriceFarFromMarketWarning({
        orderType: 'limit',
        direction: 'long',
        reduceOnly: false,
        limitPrice,
        bestBid: bid,
        bestAsk: ask,
      }),
    ).toBeUndefined();
  });

  it('warns when a short scale high endpoint is more than 5% above the ask', () => {
    expect(
      getLimitPriceFarFromMarketWarning({
        orderType: 'scale',
        direction: 'short',
        reduceOnly: false,
        startPrice: '10100',
        endPrice: '12000',
        bestBid: bid,
        bestAsk: ask,
      }),
    ).toBe('perps.order.validation.limit_price_far_from_market_ask');
  });

  it('never renders a percentage at or below the 5% threshold', () => {
    // 5.4% must display as 6%, not 5%.
    const message = getLimitPriceFarFromMarketWarning({
      orderType: 'limit',
      direction: 'long',
      reduceOnly: false,
      limitPrice: '9460',
      bestBid: 10000,
      bestAsk: 10001,
    });

    expect(message).toBe(
      'perps.order.validation.limit_price_far_from_market_bid',
    );
    expect(mockStrings).toHaveBeenLastCalledWith(
      'perps.order.validation.limit_price_far_from_market_bid',
      { percent: 6 },
    );
  });

  it('skips reduce-only orders', () => {
    expect(
      getLimitPriceFarFromMarketWarning({
        orderType: 'limit',
        direction: 'long',
        reduceOnly: true,
        limitPrice: '1000',
        bestBid: bid,
        bestAsk: ask,
      }),
    ).toBeUndefined();
  });

  it('skips market orders', () => {
    expect(
      getLimitPriceFarFromMarketWarning({
        orderType: 'market',
        direction: 'long',
        reduceOnly: false,
        limitPrice: '1000',
        bestBid: bid,
        bestAsk: ask,
      }),
    ).toBeUndefined();
  });
});

describe('getLimitPriceDirectionWarning', () => {
  const ABOVE = 'perps.order.limit_price_modal.limit_price_above';
  const BELOW = 'perps.order.limit_price_modal.limit_price_below';

  it('returns empty for unusable input', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '',
        currentPrice: 3000,
        direction: 'long',
        isClosingPosition: false,
      }),
    ).toBe('');
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '3100',
        currentPrice: 0,
        direction: 'long',
        isClosingPosition: false,
      }),
    ).toBe('');
  });

  it('returns empty for a zero limit price the field renders as empty', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '0',
        currentPrice: 3000,
        direction: 'short',
        isClosingPosition: true,
      }),
    ).toBe('');
  });

  it('warns when an opening long sits above market', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '3100',
        currentPrice: 3000,
        direction: 'long',
        isClosingPosition: false,
      }),
    ).toBe(ABOVE);
  });

  it('warns when an opening short sits below market', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '2900',
        currentPrice: 3000,
        direction: 'short',
        isClosingPosition: false,
      }),
    ).toBe(BELOW);
  });

  it('warns when closing a long below market', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '2900',
        currentPrice: 3000,
        direction: 'short',
        isClosingPosition: true,
      }),
    ).toBe(BELOW);
  });

  it('warns when closing a short above market', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '3100',
        currentPrice: 3000,
        direction: 'long',
        isClosingPosition: true,
      }),
    ).toBe(ABOVE);
  });

  it('stays silent on the favourable side of market', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '3100',
        currentPrice: 3000,
        direction: 'short',
        isClosingPosition: true,
      }),
    ).toBe('');
  });

  it('ignores currency formatting in the limit price', () => {
    expect(
      getLimitPriceDirectionWarning({
        limitPrice: '$3,100',
        currentPrice: 3000,
        direction: 'long',
        isClosingPosition: false,
      }),
    ).toBe(ABOVE);
  });
});
