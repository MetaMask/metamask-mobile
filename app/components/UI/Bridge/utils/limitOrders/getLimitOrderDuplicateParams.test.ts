import { MOCK_LIMIT_EXPIRED_ORDER } from '../../api/limitOrders/getLimitOrders/mock';
import type { LimitOrder } from '../../api/limitOrders/getLimitOrders/types';
import {
  getLimitOrderDuplicateExpirationMinutes,
  getLimitOrderDuplicateParams,
  getLimitOrderDuplicateSourceAmount,
} from './getLimitOrderDuplicateParams';

const CREATED_AT = '2026-09-03T12:00:00.000Z';

function getTimingData(lifetimeMs: number): LimitOrder['timingData'] {
  return {
    createdAt: CREATED_AT,
    expiresAt: new Date(Date.parse(CREATED_AT) + lifetimeMs).toISOString(),
  };
}

const MINUTE_MS = 60 * 1000;

describe('getLimitOrderDuplicateSourceAmount', () => {
  it('converts the source amount out of minimal units', () => {
    const result = getLimitOrderDuplicateSourceAmount(MOCK_LIMIT_EXPIRED_ORDER);

    expect(result).toBe('0.1');
  });

  it('keeps every digit of the amount', () => {
    const order: LimitOrder = {
      ...MOCK_LIMIT_EXPIRED_ORDER,
      src: { ...MOCK_LIMIT_EXPIRED_ORDER.src, amount: '123456789012345678' },
    };

    const result = getLimitOrderDuplicateSourceAmount(order);

    expect(result).toBe('0.123456789012345678');
  });

  it.each(['0', '-1', 'not-a-number', ''])(
    'returns undefined for an unusable amount of "%s"',
    (amount) => {
      const order: LimitOrder = {
        ...MOCK_LIMIT_EXPIRED_ORDER,
        src: { ...MOCK_LIMIT_EXPIRED_ORDER.src, amount },
      };

      const result = getLimitOrderDuplicateSourceAmount(order);

      expect(result).toBeUndefined();
    },
  );
});

describe('getLimitOrderDuplicateExpirationMinutes', () => {
  it.each([10, 60, 1440, 4320, 10080, 43200])(
    'matches an order that lived exactly %i minutes to that preset',
    (preset) => {
      const result = getLimitOrderDuplicateExpirationMinutes(
        getTimingData(preset * MINUTE_MS),
      );

      expect(result).toBe(preset);
    },
  );

  it('matches an order signed some time after its deadline was set to its preset', () => {
    const result = getLimitOrderDuplicateExpirationMinutes(
      getTimingData(60 * MINUTE_MS - 3 * MINUTE_MS - 25 * 1000),
    );

    expect(result).toBe(60);
  });

  it('matches an order that outlived its preset by clock drift to that preset', () => {
    const result = getLimitOrderDuplicateExpirationMinutes(
      getTimingData(60 * MINUTE_MS + 30 * 1000),
    );

    expect(result).toBe(60);
  });

  it('matches an order that outlived a preset by more than clock drift to the next one', () => {
    const result = getLimitOrderDuplicateExpirationMinutes(
      getTimingData(10 * MINUTE_MS + 2 * MINUTE_MS),
    );

    expect(result).toBe(60);
  });

  it('returns undefined for an order that outlived every preset', () => {
    const result = getLimitOrderDuplicateExpirationMinutes(
      getTimingData(43200 * MINUTE_MS + 2 * MINUTE_MS),
    );

    expect(result).toBeUndefined();
  });

  it.each([
    { name: 'no', lifetimeMs: 0 },
    { name: 'a negative', lifetimeMs: -MINUTE_MS },
  ])('returns undefined for $name lifetime', ({ lifetimeMs }) => {
    const result = getLimitOrderDuplicateExpirationMinutes(
      getTimingData(lifetimeMs),
    );

    expect(result).toBeUndefined();
  });

  it.each([
    {
      name: 'creation',
      timingData: { createdAt: 'not-a-date', expiresAt: CREATED_AT },
    },
    {
      name: 'expiration',
      timingData: { createdAt: CREATED_AT, expiresAt: 'not-a-date' },
    },
  ])(
    'returns undefined when the $name timestamp cannot be parsed',
    ({ timingData }) => {
      const result = getLimitOrderDuplicateExpirationMinutes(timingData);

      expect(result).toBeUndefined();
    },
  );
});

describe('getLimitOrderDuplicateParams', () => {
  const ENABLED_CHAIN_IDS = ['eip155:1' as const];

  it('resolves the pair, amount and expiration of the order', () => {
    const result = getLimitOrderDuplicateParams({
      order: MOCK_LIMIT_EXPIRED_ORDER,
      enabledChainIds: ENABLED_CHAIN_IDS,
    });

    expect(result).toStrictEqual({
      sourceToken: expect.objectContaining({ symbol: 'ETH', chainId: '0x1' }),
      destToken: expect.objectContaining({ symbol: 'USDC', chainId: '0x1' }),
      sourceAmount: '0.1',
      expirationMinutes: 4320,
    });
  });

  it('leaves the expiration unset when the order does not tell it', () => {
    const result = getLimitOrderDuplicateParams({
      order: {
        ...MOCK_LIMIT_EXPIRED_ORDER,
        timingData: getTimingData(-MINUTE_MS),
      },
      enabledChainIds: ENABLED_CHAIN_IDS,
    });

    expect(result).toMatchObject({ expirationMinutes: undefined });
  });

  it('returns undefined when the Limit tab is not enabled on the order network', () => {
    const result = getLimitOrderDuplicateParams({
      order: MOCK_LIMIT_EXPIRED_ORDER,
      enabledChainIds: ['eip155:10'],
    });

    expect(result).toBeUndefined();
  });

  it('returns undefined when the order tokens are on different networks', () => {
    const result = getLimitOrderDuplicateParams({
      order: {
        ...MOCK_LIMIT_EXPIRED_ORDER,
        dest: {
          ...MOCK_LIMIT_EXPIRED_ORDER.dest,
          asset: {
            ...MOCK_LIMIT_EXPIRED_ORDER.dest.asset,
            chainId: 10,
            assetId:
              'eip155:10/erc20:0x0b2c639c533813f4aa9d7837caf62653d097ff85',
          },
        },
      },
      enabledChainIds: ['eip155:1', 'eip155:10'],
    });

    expect(result).toBeUndefined();
  });
});
