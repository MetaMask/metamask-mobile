import { parseLimitOrderPageResponse } from './validators';

const ASSET = {
  assetId: 'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603',
  symbol: 'USDC',
  decimals: 6,
};

const ORDER = {
  id: '2421deda-7395-4ec9-82b8-3384aa7320e4',
  clientOrderId: '2b810d09-b372-430b-b2b7-8d9576c30e75',
  account: 'eip155:143:0x4751fd55e5b9723f427cf1a298f785ec2adcf123',
  src: { asset: ASSET, amount: '1000000' },
  dest: { asset: ASSET, amount: '1000000' },
  trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
  state: 'OPEN',
  timingData: {
    createdAt: '2026-09-03T11:02:13.000Z',
    expiresAt: '2026-09-10T15:27:54.000Z',
  },
};

const MINIMAL_PAGE = { orders: [ORDER], hasNextPage: false, total: 1 };

describe('parseLimitOrderPageResponse', () => {
  it('accepts a page carrying only the required fields', () => {
    expect(parseLimitOrderPageResponse(MINIMAL_PAGE)).toStrictEqual(
      MINIMAL_PAGE,
    );
  });

  it('accepts fields it has not seen before at every level', () => {
    const page = {
      newPageField: true,
      hasNextPage: true,
      endCursor: 'cursor',
      total: 42,
      orders: [
        {
          ...ORDER,
          newOrderField: 'new',
          src: {
            asset: { ...ASSET, coinLabel: 'badges:v1:stablecoin' },
            amount: '1000000',
            newLegField: 'new',
          },
          trigger: { ...ORDER.trigger, newTriggerField: 'new' },
          timingData: {
            ...ORDER.timingData,
            updatedAt: '2026-09-03T12:00:00.000Z',
          },
        },
      ],
    };

    expect(parseLimitOrderPageResponse(page)).toStrictEqual(page);
  });

  it('rejects a page without a total', () => {
    expect(() =>
      parseLimitOrderPageResponse({ orders: [ORDER], hasNextPage: false }),
    ).toThrow(/Invalid limit orders response/u);
  });

  it('rejects a total that is not a number', () => {
    expect(() =>
      parseLimitOrderPageResponse({ ...MINIMAL_PAGE, total: '1' }),
    ).toThrow(/Invalid limit orders response/u);
  });

  it('rejects an order without an expiry, which every booked order has', () => {
    expect(() =>
      parseLimitOrderPageResponse({
        ...MINIMAL_PAGE,
        orders: [
          { ...ORDER, timingData: { createdAt: '2026-09-03T11:02:13.000Z' } },
        ],
      }),
    ).toThrow(/Invalid limit orders response/u);
  });

  it('rejects an asset whose decimals are not a number', () => {
    expect(() =>
      parseLimitOrderPageResponse({
        ...MINIMAL_PAGE,
        orders: [
          {
            ...ORDER,
            src: { asset: { ...ASSET, decimals: '6' }, amount: '1000000' },
          },
        ],
      }),
    ).toThrow(/Invalid limit orders response/u);
  });

  it('rethrows a non-validation error', () => {
    // A getter that throws is not a StructError, so it must propagate as-is.
    expect(() =>
      parseLimitOrderPageResponse({
        get orders() {
          throw new RangeError('boom');
        },
      }),
    ).toThrow(RangeError);
  });
});
