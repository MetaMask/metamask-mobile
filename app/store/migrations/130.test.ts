import migrate from './130';
import { ensureValidState } from './util';

jest.mock('@sentry/react-native', () => ({
  captureException: jest.fn(),
}));

jest.mock('./util', () => ({
  ensureValidState: jest.fn(),
}));

describe('migration 130', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('does not modify the state if `ensureValidState` returns false', () => {
    const state = { some: 'state' };
    jest.mocked(ensureValidState).mockReturnValue(false);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged when `fiatOrders.orders` is missing', () => {
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: {},
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged when `fiatOrders` is not present', () => {
    const state = {
      engine: { backgroundState: {} },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('returns state unchanged when `fiatOrders.orders` is not an array', () => {
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: 'not-array' },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state);

    expect(result).toBe(state);
  });

  it('leaves an empty orders list unchanged', () => {
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state);

    expect(result).toStrictEqual(state);
  });

  it('does not change non-DEPOSIT orders even when data.id differs from order.id', () => {
    const order = {
      provider: 'AGGREGATOR',
      id: 'top-level-id',
      data: { id: '/providers/path/order-1' },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toStrictEqual(order);
  });

  it('does not change DEPOSIT orders when data.id matches order.id', () => {
    const canonicalId = '/providers/transak-native-staging/orders/abc';
    const order = {
      provider: 'DEPOSIT',
      id: canonicalId,
      data: { id: canonicalId },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toStrictEqual(order);
  });

  it('sets order.id from data.id when they differ for DEPOSIT orders', () => {
    const canonicalId = '/providers/transak-native-staging/orders/uuid-123';
    const order = {
      provider: 'DEPOSIT',
      id: 'uuid-123',
      data: { id: canonicalId },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toEqual({
      ...order,
      id: canonicalId,
    });
  });

  it('does not modify DEPOSIT orders without data', () => {
    const order = {
      provider: 'DEPOSIT',
      id: 'only-top',
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toStrictEqual(order);
  });

  it('does not modify DEPOSIT orders when data.id is missing', () => {
    const order = {
      provider: 'DEPOSIT',
      id: 'top',
      data: { other: true },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toStrictEqual(order);
  });

  it('does not modify DEPOSIT orders when data.id is not a string', () => {
    const order = {
      provider: 'DEPOSIT',
      id: 'top',
      data: { id: 12345 },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toStrictEqual(order);
  });

  it('sets id from data.id when order.id is missing', () => {
    const canonicalId = '/providers/transak-native-staging/orders/only-in-data';
    const order = {
      provider: 'DEPOSIT',
      data: { id: canonicalId },
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [order] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toEqual({
      ...order,
      id: canonicalId,
    });
  });

  it('migrates only matching DEPOSIT orders in a mixed list', () => {
    const canonicalId = '/providers/transak-native-staging/orders/full';
    const depositFixed = {
      provider: 'DEPOSIT',
      id: 'short',
      data: { id: canonicalId },
    };
    const depositOk = {
      provider: 'DEPOSIT',
      id: canonicalId,
      data: { id: canonicalId },
    };
    const other = {
      provider: 'AGGREGATOR',
      id: 'agg-1',
    };
    const state = {
      engine: { backgroundState: {} },
      fiatOrders: { orders: [depositFixed, depositOk, other] },
    };
    jest.mocked(ensureValidState).mockReturnValue(true);

    const result = migrate(state) as typeof state;

    expect(result.fiatOrders.orders[0]).toEqual({
      ...depositFixed,
      id: canonicalId,
    });
    expect(result.fiatOrders.orders[1]).toStrictEqual(depositOk);
    expect(result.fiatOrders.orders[2]).toStrictEqual(other);
  });
});
