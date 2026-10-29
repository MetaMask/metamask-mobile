import type { OrderResult, OrderType } from '@metamask/perps-controller';
import { buildPerpsCopyTradeIntent, getCopyTradeOid } from './copyTradeIntent';

const COMMENT_ID = '7f1a9c2e-5b8d-4e3f-9a6c-1d2e3f4a5b6c';
const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';

const createResult = (overrides: Partial<OrderResult> = {}): OrderResult => ({
  success: true,
  orderId: '123456789',
  ...overrides,
});

const createParams = (
  overrides: Partial<Parameters<typeof buildPerpsCopyTradeIntent>[0]> = {},
): Parameters<typeof buildPerpsCopyTradeIntent>[0] => ({
  copyTradeOrigin: { commentId: COMMENT_ID, asset: 'BTC' },
  asset: 'BTC',
  orderType: 'market',
  result: createResult(),
  address: ADDRESS,
  activeProvider: 'hyperliquid',
  ...overrides,
});

describe('getCopyTradeOid', () => {
  it.each([
    'market',
    'limit',
    'stop_market',
    'take_profit_limit',
  ] as OrderType[])('returns the order id for a %s order', (orderType) => {
    const result = createResult({ orderId: '42' });

    const oid = getCopyTradeOid(orderType, result);

    expect(oid).toBe('42');
  });

  it.each(['scale', 'twap', 'chase'] as OrderType[])(
    'returns no ids for a %s order',
    (orderType) => {
      const result = createResult({ orderId: '777' });

      const oid = getCopyTradeOid(orderType, result);

      expect(oid).toBeUndefined();
    },
  );

  it('returns no ids when the order id is empty', () => {
    const result = createResult({ orderId: '' });

    const oid = getCopyTradeOid('market', result);

    expect(oid).toBeUndefined();
  });

  it('returns no ids when the order id is missing', () => {
    const result = createResult({ orderId: undefined });

    const oid = getCopyTradeOid('market', result);

    expect(oid).toBeUndefined();
  });

  it('returns no ids without a result', () => {
    const oid = getCopyTradeOid('market', undefined);

    expect(oid).toBeUndefined();
  });
});

describe('buildPerpsCopyTradeIntent', () => {
  it('builds one intent with the Arbitrum copier account for a Hyperliquid order', () => {
    const params = createParams();

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toStrictEqual({
      origin: { kind: 'comment', id: COMMENT_ID },
      copierAccount: { caip10: `eip155:42161:${ADDRESS}` },
      execution: { product: 'perps', oid: '123456789' },
    });
  });

  it('builds nothing without a copy-trade origin', () => {
    const params = createParams({ copyTradeOrigin: undefined });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });

  it('builds nothing when the order is on another market', () => {
    const params = createParams({ asset: 'ETH' });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });

  it('builds nothing without a trading address', () => {
    const params = createParams({ address: undefined });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });

  it('builds nothing when the result reports a Lighter order', () => {
    const params = createParams({
      result: createResult({ providerId: 'lighter' }),
    });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });

  it('builds nothing when Lighter is the active provider', () => {
    const params = createParams({ activeProvider: 'lighter' });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });

  it.each([undefined, 'aggregated'])(
    'treats a %s active provider as Hyperliquid',
    (activeProvider) => {
      const params = createParams({ activeProvider });

      const intent = buildPerpsCopyTradeIntent(params);

      expect(intent).toBeDefined();
    },
  );

  it('uses the provider reported by the result over the active provider', () => {
    const params = createParams({
      activeProvider: 'lighter',
      result: createResult({ providerId: 'hyperliquid' }),
    });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeDefined();
  });

  it('builds nothing for a TWAP order', () => {
    const params = createParams({ orderType: 'twap' });

    const intent = buildPerpsCopyTradeIntent(params);

    expect(intent).toBeUndefined();
  });
});
