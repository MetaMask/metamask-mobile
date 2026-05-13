import { RampsOrderStatus, type RampsOrder } from '@metamask/ramps-controller';

import {
  awaitOrderTerminalState,
  getOrder,
  isTerminalOrderStatus,
  OrderTerminalStateTimeoutError,
  refreshOrder,
  RefreshOrderUnresolvableError,
} from './orderTerminalState';

// Centralised mock state. Tests mutate `mockOrders` between runs to control
// what `selectRampsOrders` observes; mockSubscribers are fired manually so we
// don't need a real redux store.
let mockOrders: RampsOrder[] = [];
const mockSubscribers = new Set<() => void>();

const mockGetOrder = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      RampsController: {
        getOrder: (...args: unknown[]) => mockGetOrder(...args),
      },
    },
  },
}));

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: {
      getState: () => ({
        // Shape doesn't matter — selectRampsOrders is mocked below.
      }),
      subscribe: (listener: () => void) => {
        mockSubscribers.add(listener);
        return () => mockSubscribers.delete(listener);
      },
    },
  },
}));

jest.mock('../../../../selectors/rampsController', () => ({
  selectRampsOrders: () => mockOrders,
}));

const SAMPLE_ORDER_ID = 'order-abc';
const SAMPLE_ORDER_PATH = '/providers/moonpay/orders/order-abc';
const SAMPLE_PROVIDER_ID = '/providers/moonpay';
const SAMPLE_WALLET = '0xWALLET';

function buildOrder(overrides: Partial<RampsOrder> = {}): RampsOrder {
  return {
    isOnlyLink: false,
    success: true,
    cryptoAmount: 1,
    fiatAmount: 25,
    providerOrderId: SAMPLE_ORDER_ID,
    providerOrderLink: '',
    createdAt: 0,
    totalFeesFiat: 0,
    txHash: '',
    walletAddress: SAMPLE_WALLET,
    status: RampsOrderStatus.Pending,
    network: { name: 'linea', chainId: 'eip155:59144' },
    canBeUpdated: true,
    idHasExpired: false,
    excludeFromPurchases: false,
    timeDescriptionPending: '',
    provider: {
      id: SAMPLE_PROVIDER_ID,
      name: 'MoonPay',
    } as RampsOrder['provider'],
    ...overrides,
  } as RampsOrder;
}

function flushSubscribers() {
  // Mirror redux semantics: snapshot before invoking so a listener that
  // unsubscribes mid-flush doesn't break iteration.
  Array.from(mockSubscribers).forEach((fn) => fn());
}

beforeEach(() => {
  mockOrders = [];
  mockSubscribers.clear();
  mockGetOrder.mockReset();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('isTerminalOrderStatus', () => {
  it.each([
    [RampsOrderStatus.Completed, true],
    [RampsOrderStatus.Failed, true],
    [RampsOrderStatus.Cancelled, true],
    [RampsOrderStatus.IdExpired, true],
    [RampsOrderStatus.Pending, false],
    [RampsOrderStatus.Created, false],
    [RampsOrderStatus.Precreated, false],
    [RampsOrderStatus.Unknown, false],
  ])('returns the right verdict for %s', (status, expected) => {
    expect(isTerminalOrderStatus(status as RampsOrderStatus)).toBe(expected);
  });
});

describe('getOrder', () => {
  it('returns the order matching a bare provider order id', () => {
    const order = buildOrder();
    mockOrders = [order];
    expect(getOrder(SAMPLE_ORDER_ID)).toBe(order);
  });

  it('extracts the order code from a `/providers/.../orders/<id>` path', () => {
    const order = buildOrder();
    mockOrders = [order];
    expect(getOrder(SAMPLE_ORDER_PATH)).toBe(order);
  });

  it('returns undefined when no order matches', () => {
    expect(getOrder('order-missing')).toBeUndefined();
  });
});

describe('refreshOrder', () => {
  it('looks up the order by id and forwards to RampsController.getOrder', async () => {
    const order = buildOrder({ status: RampsOrderStatus.Completed });
    mockOrders = [order];
    mockGetOrder.mockResolvedValue(order);

    const result = await refreshOrder(SAMPLE_ORDER_ID);
    expect(result).toBe(order);
    expect(mockGetOrder).toHaveBeenCalledWith(
      SAMPLE_PROVIDER_ID,
      SAMPLE_ORDER_ID,
      SAMPLE_WALLET,
    );
  });

  it('accepts a RampsOrder directly without a state lookup', async () => {
    const order = buildOrder({ status: RampsOrderStatus.Pending });
    // Note: not added to mockOrders. The string-id path would fail to
    // resolve walletAddress; the order-arg path bypasses that.
    mockGetOrder.mockResolvedValue(order);

    await refreshOrder(order);
    expect(mockGetOrder).toHaveBeenCalledWith(
      SAMPLE_PROVIDER_ID,
      SAMPLE_ORDER_ID,
      SAMPLE_WALLET,
    );
  });

  it('honors an explicit walletAddress override', async () => {
    const order = buildOrder();
    mockOrders = [order];
    mockGetOrder.mockResolvedValue(order);

    await refreshOrder(SAMPLE_ORDER_ID, { walletAddress: '0xOTHER' });
    expect(mockGetOrder).toHaveBeenCalledWith(
      SAMPLE_PROVIDER_ID,
      SAMPLE_ORDER_ID,
      '0xOTHER',
    );
  });

  it('throws RefreshOrderUnresolvableError when the order has no provider.id', async () => {
    const order = buildOrder({ provider: undefined });
    mockOrders = [order];
    await expect(refreshOrder(SAMPLE_ORDER_ID)).rejects.toThrow(
      RefreshOrderUnresolvableError,
    );
  });

  it('throws RefreshOrderUnresolvableError when no walletAddress is resolvable', async () => {
    // Order is not in state and no walletAddress was provided — even though
    // we have a provider via the order arg, the wallet is missing.
    const order = buildOrder({ walletAddress: '' });
    await expect(refreshOrder(order)).rejects.toThrow(
      RefreshOrderUnresolvableError,
    );
  });

  it('extracts the order code from a `/providers/.../orders/<id>` path', async () => {
    const order = buildOrder();
    mockOrders = [order];
    mockGetOrder.mockResolvedValue(order);

    await refreshOrder(SAMPLE_ORDER_PATH);
    expect(mockGetOrder).toHaveBeenCalledWith(
      SAMPLE_PROVIDER_ID,
      SAMPLE_ORDER_ID,
      SAMPLE_WALLET,
    );
  });
});

describe('awaitOrderTerminalState', () => {
  it('resolves immediately when the order is already terminal', async () => {
    const order = buildOrder({ status: RampsOrderStatus.Completed });
    mockOrders = [order];

    const result = await awaitOrderTerminalState(SAMPLE_ORDER_ID);
    expect(result).toBe(order);
    expect(mockSubscribers.size).toBe(0); // never subscribed
  });

  it('resolves on a redux update that flips the order to a terminal status', async () => {
    const pending = buildOrder({ status: RampsOrderStatus.Pending });
    mockOrders = [pending];
    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID);
    expect(mockSubscribers.size).toBe(1);

    const completed = buildOrder({ status: RampsOrderStatus.Completed });
    mockOrders = [completed];
    flushSubscribers();

    await expect(promise).resolves.toBe(completed);
    expect(mockSubscribers.size).toBe(0);
  });

  it('treats IdExpired as terminal', async () => {
    const order = buildOrder({ status: RampsOrderStatus.IdExpired });
    mockOrders = [order];
    await expect(awaitOrderTerminalState(SAMPLE_ORDER_ID)).resolves.toBe(order);
  });

  it('rejects with OrderTerminalStateTimeoutError when timeoutMs elapses', async () => {
    mockOrders = [buildOrder({ status: RampsOrderStatus.Pending })];
    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID, {
      timeoutMs: 500,
    });
    // Surface unhandled rejection assertions before advancing the clock.
    promise.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(500);
    await expect(promise).rejects.toBeInstanceOf(
      OrderTerminalStateTimeoutError,
    );
    expect(mockSubscribers.size).toBe(0);
  });

  it('cleans up subscription, interval, and timeout on resolution', async () => {
    mockOrders = [buildOrder({ status: RampsOrderStatus.Pending })];
    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID, {
      timeoutMs: 60_000,
      pollIntervalMs: 1000,
    });
    expect(mockSubscribers.size).toBe(1);
    expect(jest.getTimerCount()).toBe(2); // timeout + poll interval

    mockOrders = [buildOrder({ status: RampsOrderStatus.Completed })];
    flushSubscribers();
    await promise;

    expect(mockSubscribers.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('cleans up everything when the timeout fires', async () => {
    mockOrders = [buildOrder({ status: RampsOrderStatus.Pending })];
    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID, {
      timeoutMs: 200,
      pollIntervalMs: 1000,
    });
    promise.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(200);
    await expect(promise).rejects.toBeInstanceOf(
      OrderTerminalStateTimeoutError,
    );
    expect(mockSubscribers.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('falls back to a direct controller poll when redux never updates', async () => {
    const pending = buildOrder({ status: RampsOrderStatus.Pending });
    mockOrders = [pending];
    const completed = buildOrder({ status: RampsOrderStatus.Completed });
    mockGetOrder.mockResolvedValue(completed);

    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID, {
      pollIntervalMs: 100,
    });
    await jest.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toBe(completed);
    expect(mockGetOrder).toHaveBeenCalledWith(
      SAMPLE_PROVIDER_ID,
      SAMPLE_ORDER_ID,
      SAMPLE_WALLET,
    );
  });

  it('keeps polling silently when the controller call rejects', async () => {
    const pending = buildOrder({ status: RampsOrderStatus.Pending });
    mockOrders = [pending];
    mockGetOrder
      .mockRejectedValueOnce(new Error('flaky 500'))
      .mockResolvedValueOnce(
        buildOrder({ status: RampsOrderStatus.Completed }),
      );

    const promise = awaitOrderTerminalState(SAMPLE_ORDER_ID, {
      pollIntervalMs: 100,
    });
    await jest.advanceTimersByTimeAsync(100);
    await jest.advanceTimersByTimeAsync(100);
    await expect(promise).resolves.toMatchObject({
      status: RampsOrderStatus.Completed,
    });
  });

  it('survives 100 concurrent calls for the same order with no leftover subscriptions', async () => {
    mockOrders = [buildOrder({ status: RampsOrderStatus.Pending })];
    const promises = Array.from({ length: 100 }, () =>
      awaitOrderTerminalState(SAMPLE_ORDER_ID),
    );
    expect(mockSubscribers.size).toBe(100);

    mockOrders = [buildOrder({ status: RampsOrderStatus.Completed })];
    flushSubscribers();

    const results = await Promise.all(promises);
    expect(results).toHaveLength(100);
    expect(mockSubscribers.size).toBe(0);
    expect(jest.getTimerCount()).toBe(0);
  });

  it('OrderTerminalStateTimeoutError survives instanceof through subclassing (Hermes safety)', async () => {
    const error = new OrderTerminalStateTimeoutError('boom');
    expect(error instanceof OrderTerminalStateTimeoutError).toBe(true);
    expect(error instanceof Error).toBe(true);
    expect(error.name).toBe('OrderTerminalStateTimeoutError');
    expect(error.message).toBe('boom');
  });
});
