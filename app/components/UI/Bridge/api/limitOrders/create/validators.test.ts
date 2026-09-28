import {
  isCreateLimitOrderResponse,
  parseCreateLimitOrderResponse,
} from './validators';

const ASSET = {
  assetId: 'eip155:56/erc20:0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
  decimals: 18,
};

const MINIMAL_RESPONSE = {
  order: {
    id: '2421deda-7395-4ec9-82b8-3384aa7320e4',
    clientOrderId: '26b0d825-79da-45a9-ab7d-1397a091b80e',
    account: 'eip155:56:0x4751fd55e5b9723f427cf1a298f785ec2adcf123',
    src: { asset: ASSET, amount: '1000000' },
    dest: { asset: ASSET, amount: '1000000' },
    trigger: { kind: 'dest_price', threshold: 'above', price: '0.001' },
    state: 'OPEN',
    timingData: { createdAt: '2026-09-03T11:02:13.000Z' },
  },
};

describe('parseCreateLimitOrderResponse', () => {
  it('accepts a response carrying only the required fields', () => {
    expect(parseCreateLimitOrderResponse(MINIMAL_RESPONSE)).toStrictEqual(
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
    };

    expect(parseCreateLimitOrderResponse(response)).toStrictEqual(response);
  });

  it('rejects a transaction hash that is not hex', () => {
    expect(() =>
      parseCreateLimitOrderResponse({
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
    ).toThrow(/Invalid create limit order response/u);
  });

  it('rejects an asset whose decimals are not a number', () => {
    expect(() =>
      parseCreateLimitOrderResponse({
        order: {
          ...MINIMAL_RESPONSE.order,
          src: { asset: { ...ASSET, decimals: '18' }, amount: '1000000' },
        },
      }),
    ).toThrow(/Invalid create limit order response/u);
  });

  it('rethrows a non-validation error', () => {
    // A getter that throws is not a StructError, so it must propagate as-is.
    expect(() =>
      parseCreateLimitOrderResponse({
        get order() {
          throw new RangeError('boom');
        },
      }),
    ).toThrow(RangeError);
  });
});

describe('isCreateLimitOrderResponse', () => {
  it('returns true for a valid response', () => {
    expect(isCreateLimitOrderResponse(MINIMAL_RESPONSE)).toBe(true);
  });

  it('returns false for a response missing the order', () => {
    expect(isCreateLimitOrderResponse({ transactions: [] })).toBe(false);
  });

  it('returns false for a non-object', () => {
    expect(isCreateLimitOrderResponse('nope')).toBe(false);
  });
});
