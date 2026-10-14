import {
  isCancelLimitOrderResponse,
  parseCancelLimitOrderResponse,
} from './validators';

const ASSET = {
  assetId: 'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603',
  symbol: 'USDC',
  decimals: 6,
};

const MINIMAL_RESPONSE = {
  order: {
    id: '2421deda-7395-4ec9-82b8-3384aa7320e4',
    clientOrderId: '2b810d09-b372-430b-b2b7-8d9576c30e75',
    account: 'eip155:143:0x4751fd55e5b9723f427cf1a298f785ec2adcf123',
    src: { asset: ASSET, amount: '1000000' },
    dest: { asset: ASSET, amount: '1000000' },
    trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
    state: 'CANCELLED',
    timingData: {
      createdAt: '2026-09-03T11:02:13.000Z',
      expiresAt: '2026-09-10T15:27:54.000Z',
    },
  },
};

describe('parseCancelLimitOrderResponse', () => {
  it('accepts a response carrying only the required fields', () => {
    expect(parseCancelLimitOrderResponse(MINIMAL_RESPONSE)).toStrictEqual(
      MINIMAL_RESPONSE,
    );
  });

  it('accepts order states and failure reasons it has not seen before', () => {
    const response = {
      order: {
        ...MINIMAL_RESPONSE.order,
        state: 'SOME_NEW_STATE',
        failureReason: 'SOME_NEW_REASON',
      },
      transactions: [],
    };

    expect(parseCancelLimitOrderResponse(response)).toStrictEqual(response);
  });

  it('rejects an order without an expiry, which every booked order has', () => {
    expect(() =>
      parseCancelLimitOrderResponse({
        order: {
          ...MINIMAL_RESPONSE.order,
          timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
        },
      }),
    ).toThrow(/Invalid cancel limit order response/u);
  });

  it('rejects a response without the order', () => {
    expect(() => parseCancelLimitOrderResponse({ transactions: [] })).toThrow(
      /Invalid cancel limit order response/u,
    );
  });

  it('rejects a transaction hash that is not hex', () => {
    expect(() =>
      parseCancelLimitOrderResponse({
        ...MINIMAL_RESPONSE,
        transactions: [
          {
            status: 'executed',
            txHash: 'not-hex',
            src: { asset: ASSET, amount: '1' },
            dest: { asset: ASSET, amount: '1' },
            timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
          },
        ],
      }),
    ).toThrow(/Invalid cancel limit order response/u);
  });

  it('rethrows a non-validation error', () => {
    // A getter that throws is not a StructError, so it must propagate as-is.
    expect(() =>
      parseCancelLimitOrderResponse({
        get order() {
          throw new RangeError('boom');
        },
      }),
    ).toThrow(RangeError);
  });
});

describe('isCancelLimitOrderResponse', () => {
  it('returns true for a valid response', () => {
    expect(isCancelLimitOrderResponse(MINIMAL_RESPONSE)).toBe(true);
  });

  it('returns false for an invalid response', () => {
    expect(isCancelLimitOrderResponse({ order: {} })).toBe(false);
  });
});
