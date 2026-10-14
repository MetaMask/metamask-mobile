import type { OrderResult, OrderType } from '@metamask/perps-controller';
import {
  buildPerpsCopyTradeIntents,
  getCopyTradeOids,
} from './copyTradeIntents';

const COMMENT_ID = '7f1a9c2e-5b8d-4e3f-9a6c-1d2e3f4a5b6c';
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const createResult = (overrides: Partial<OrderResult> = {}): OrderResult => ({
  success: true,
  orderId: '123456789',
  ...overrides,
});

const createParams = (
  overrides: Partial<Parameters<typeof buildPerpsCopyTradeIntents>[0]> = {},
): Parameters<typeof buildPerpsCopyTradeIntents>[0] => ({
  copyTradeOrigin: { commentId: COMMENT_ID, asset: 'BTC' },
  asset: 'BTC',
  orderType: 'market',
  result: createResult(),
  address: ADDRESS,
  activeProvider: 'hyperliquid',
  ...overrides,
});

describe('getCopyTradeOids', () => {
  it.each([
    'market',
    'limit',
    'stop_market',
    'take_profit_limit',
  ] as OrderType[])('returns the order id for a %s order', (orderType) => {
    const result = createResult({ orderId: '42' });

    const oids = getCopyTradeOids(orderType, result);

    expect(oids).toStrictEqual(['42']);
  });

  it('returns every child order id for a scale order', () => {
    const result = createResult({
      orderId: 'scale-group-1',
      childOrderIds: ['101', '102', '103'],
    });

    const oids = getCopyTradeOids('scale', result);

    expect(oids).toStrictEqual(['101', '102', '103']);
  });

  it('returns no ids for a scale order without children', () => {
    const result = createResult({ orderId: 'scale-group-1' });

    const oids = getCopyTradeOids('scale', result);

    expect(oids).toStrictEqual([]);
  });

  it.each(['twap', 'chase'] as OrderType[])(
    'returns no ids for a %s order',
    (orderType) => {
      const result = createResult({ orderId: '777' });

      const oids = getCopyTradeOids(orderType, result);

      expect(oids).toStrictEqual([]);
    },
  );

  it('drops empty order ids', () => {
    const result = createResult({ childOrderIds: ['101', '', '103'] });

    const oids = getCopyTradeOids('scale', result);

    expect(oids).toStrictEqual(['101', '103']);
  });

  it('returns no ids when the order id is missing', () => {
    const result = createResult({ orderId: undefined });

    const oids = getCopyTradeOids('market', result);

    expect(oids).toStrictEqual([]);
  });

  it('returns no ids without a result', () => {
    const oids = getCopyTradeOids('market', undefined);

    expect(oids).toStrictEqual([]);
  });
});

describe('buildPerpsCopyTradeIntents', () => {
  it('builds one intent with the Arbitrum copier account for a Hyperliquid order', () => {
    const params = createParams();

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([
      {
        origin: { kind: 'comment', id: COMMENT_ID },
        copierAccount: { caip10: `eip155:42161:${ADDRESS}` },
        execution: { product: 'perps', oid: '123456789' },
      },
    ]);
  });

  it('builds one intent per scale child', () => {
    const params = createParams({
      orderType: 'scale',
      result: createResult({ childOrderIds: ['101', '102'] }),
    });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents.map((intent) => intent.execution)).toStrictEqual([
      { product: 'perps', oid: '101' },
      { product: 'perps', oid: '102' },
    ]);
  });

  it('builds nothing without a copy-trade origin', () => {
    const params = createParams({ copyTradeOrigin: undefined });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });

  it('builds nothing when the order is on another market', () => {
    const params = createParams({ asset: 'ETH' });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });

  it('builds nothing without a trading address', () => {
    const params = createParams({ address: undefined });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });

  it('builds nothing when the result reports a Lighter order', () => {
    const params = createParams({
      result: createResult({ providerId: 'lighter' }),
    });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });

  it('builds nothing when Lighter is the active provider', () => {
    const params = createParams({ activeProvider: 'lighter' });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });

  it.each([undefined, 'aggregated'])(
    'treats a %s active provider as Hyperliquid',
    (activeProvider) => {
      const params = createParams({ activeProvider });

      const intents = buildPerpsCopyTradeIntents(params);

      expect(intents).toHaveLength(1);
    },
  );

  it('uses the provider reported by the result over the active provider', () => {
    const params = createParams({
      activeProvider: 'lighter',
      result: createResult({ providerId: 'hyperliquid' }),
    });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toHaveLength(1);
  });

  it('builds nothing for a TWAP order', () => {
    const params = createParams({ orderType: 'twap' });

    const intents = buildPerpsCopyTradeIntents(params);

    expect(intents).toStrictEqual([]);
  });
});
