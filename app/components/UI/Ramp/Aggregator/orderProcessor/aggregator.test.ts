import { Order } from '@consensys/on-ramp-sdk';
import { FiatOrder } from '../../../../../reducers/fiatOrders';
import {
  aggregatorOrderToFiatOrder,
  MAX_ERROR_COUNT,
  POLLING_FREQUENCY,
  POLLING_FRECUENCY_IN_SECONDS,
  processAggregatorOrder,
} from './aggregator';

describe('aggregatorOrderToFiatOrder', () => {
  const now = 1673886669608;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterAll(() => {
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should return a fiat order', () => {
    const mockOrder = {
      id: 'test-id',
      isOnlyLink: false,
      provider: {
        id: 'test-provider',
        name: 'Test Provider',
      },
      createdAt: 1673886669608,
      fiatAmount: 123,
      totalFeesFiat: 9,
      cryptoAmount: 0.012361263,
      cryptoCurrency: {
        symbol: 'BTC',
      },
      fiatCurrency: {
        symbol: 'USD',
        denomSymbol: '$',
      },
      network: '1',
      status: 'COMPLETED',
      orderType: 'BUY',
      walletAddress: '0x1234',
      txHash: '0x987654321',
      excludeFromPurchases: false,
    };

    const failedOrder = {
      ...mockOrder,
      status: 'FAILED',
    };

    const cancelledOrder = {
      ...mockOrder,
      status: 'CANCELLED',
    };
    const pendingOrder = {
      ...mockOrder,
      status: 'PENDING',
    };
    const createdOrder = {
      ...mockOrder,
      orderType: 'SELL',
      status: 'CREATED',
    };

    const unknownStateOrder = {
      ...mockOrder,
      status: 'UNKNOWN_STATE',
    };

    expect(aggregatorOrderToFiatOrder(mockOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'COMPLETED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder,
    });

    expect(aggregatorOrderToFiatOrder(failedOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'FAILED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: failedOrder,
    });
    expect(aggregatorOrderToFiatOrder(cancelledOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'CANCELLED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: cancelledOrder,
    });
    expect(aggregatorOrderToFiatOrder(pendingOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'PENDING',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: pendingOrder,
    });

    expect(aggregatorOrderToFiatOrder(createdOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'CREATED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'SELL',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: createdOrder,
    });

    expect(aggregatorOrderToFiatOrder(unknownStateOrder as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '$',
      cryptocurrency: 'BTC',
      state: 'PENDING',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: unknownStateOrder,
    });
  });

  it('should return a fiat order with default values', () => {
    const mockOrder1 = {
      id: 'test-id',
      isOnlyLink: false,
      provider: {
        id: 'test-provider',
        name: 'Test Provider',
      },
      createdAt: 1673886669608,
      fiatAmount: 123,
      network: '1',
      status: 'COMPLETED',
      orderType: 'BUY',
      walletAddress: '0x1234',
      txHash: '0x987654321',
      excludeFromPurchases: false,
    };

    const mockOrder2 = {
      id: 'test-id',
      isOnlyLink: false,
      provider: {
        id: 'test-provider',
        name: 'Test Provider',
      },
      createdAt: 1673886669608,
      fiatAmount: 123,
      cryptoCurrency: {
        network: {
          chainId: '1',
        },
      },
      status: 'COMPLETED',
      orderType: 'BUY',
      walletAddress: '0x1234',
      txHash: '0x987654321',
      excludeFromPurchases: false,
    };

    expect(aggregatorOrderToFiatOrder(mockOrder1 as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      cryptoAmount: 0,
      cryptoFee: 0,
      currency: '',
      currencySymbol: '',
      cryptocurrency: '',
      state: 'COMPLETED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder1,
    });
    expect(aggregatorOrderToFiatOrder(mockOrder2 as unknown as Order)).toEqual({
      id: 'test-id',
      provider: 'AGGREGATOR',
      createdAt: 1673886669608,
      amount: 123,
      cryptoAmount: 0,
      cryptoFee: 0,
      currency: '',
      currencySymbol: '',
      cryptocurrency: '',
      state: 'COMPLETED',
      account: '0x1234',
      network: '1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'BUY',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder2,
    });
  });
});

const mockGetOrder = jest.fn();
const mockGetSellOrder = jest.fn();

jest.mock('../sdk', () => ({
  SDK: {
    orders: () => ({
      getOrder: mockGetOrder,
      getSellOrder: mockGetSellOrder,
    }),
  },
}));

describe('processAggregatorOrder', () => {
  const mockOrder = {
    id: 'test-id',
    provider: 'AGGREGATOR',
    createdAt: 1673886669608,
    amount: 123,
    fee: 9,
    cryptoAmount: 0.012361263,
    cryptoFee: 9,
    currency: 'USD',
    currencySymbol: '$',
    cryptocurrency: 'BTC',
    state: 'COMPLETED',
    account: '0x1234',
    network: '1',
    txHash: '0x987654321',
    excludeFromPurchases: false,
    orderType: 'BUY',
    errorCount: 0,
    lastTimeFetched: 1673886669600,
    data: {
      id: 'test-id',
      isOnlyLink: false,
      provider: {
        id: 'test-provider',
        name: 'Test Provider',
      },
      createdAt: 1673886669608,
      fiatAmount: 123,
      totalFeesFiat: 9,
      cryptoAmount: 0.012361263,
      cryptoCurrency: {
        symbol: 'BTC',
      },
      fiatCurrency: {
        symbol: 'USD',
        denomSymbol: '$',
      },
      network: '1',
      status: 'COMPLETED',
      orderType: 'BUY',
      walletAddress: '0x1234',
      txHash: '0x987654321',
      excludeFromPurchases: false,
    },
  } as FiatOrder;

  afterEach(() => {
    jest.spyOn(Date, 'now').mockClear();
    mockGetOrder.mockClear();
    mockGetSellOrder.mockClear();
  });

  it('should process an order', async () => {
    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
      status: 'FAILED',
    }));
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...mockOrder,
      state: 'FAILED',
      lastTimeFetched: 1673886669600,
      fetchErrorCount: 0,
      data: { ...mockOrder.data, status: 'FAILED' },
    });
  });

  it('should process a sell order', async () => {
    const sellOrder = {
      ...mockOrder,
      orderType: 'SELL',
      state: 'CREATED',
      data: {
        ...mockOrder.data,
        orderType: 'SELL',
      },
    } as FiatOrder;
    mockGetSellOrder.mockImplementation(() => ({
      ...sellOrder.data,
      status: 'FAILED',
    }));
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(sellOrder);
    expect(mockGetSellOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...sellOrder,
      state: 'FAILED',
      lastTimeFetched: 1673886669600,
      fetchErrorCount: 0,
      data: { ...sellOrder.data, status: 'FAILED' },
    });
  });

  it('increments errorCount when the order response is empty', async () => {
    mockGetOrder.mockImplementation(() => null);
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(mockGetOrder).toHaveReturnedWith(null);
    expect(updatedOrder).toEqual({
      ...mockOrder,
      errorCount: 1,
      lastTimeFetched: 1673886669600,
      fetchErrorCount: 1,
    });
  });

  it('increments errorCount when order processing throws', async () => {
    mockGetOrder.mockImplementation(() => {
      throw new Error('test error');
    });
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...mockOrder,
      errorCount: 1,
      lastTimeFetched: 1673886669600,
      fetchErrorCount: 1,
    });
  });

  it('should return the same object if the error backoff time has not passed', async () => {
    const lastTimeFetched = 1000;
    const errorCount = 3;

    jest
      .spyOn(Date, 'now')
      .mockImplementation(
        () =>
          lastTimeFetched +
          Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000 -
          1,
      );
    const orderWithErrors = { ...mockOrder, lastTimeFetched, errorCount };
    const updatedOrder = await processAggregatorOrder(orderWithErrors);
    expect(mockGetOrder).not.toHaveBeenCalled();
    expect(updatedOrder).toEqual(orderWithErrors);
  });

  it('should return an updated object if the error backoff time has passed', async () => {
    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
    }));

    const lastTimeFetched = 1000;
    const errorCount = 3;

    const now =
      lastTimeFetched +
      Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000 +
      1;

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const orderWithErrors = { ...mockOrder, lastTimeFetched, errorCount };

    const updatedOrder = await processAggregatorOrder(orderWithErrors);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...orderWithErrors,
      errorCount: 0,
      lastTimeFetched: now,
      fetchErrorCount: 0,
    });
  });

  it('should return an updated object if the error backoff time has not passed and processing was forced', async () => {
    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
    }));
    const lastTimeFetched = 1000;
    const errorCount = 3;

    const now =
      lastTimeFetched +
      Math.pow(POLLING_FRECUENCY_IN_SECONDS, errorCount + 1) * 1000 -
      1;

    jest.spyOn(Date, 'now').mockImplementation(() => now);
    const orderWithErrors = { ...mockOrder, lastTimeFetched, errorCount };
    const updatedOrder = await processAggregatorOrder(orderWithErrors, {
      forced: true,
    });
    expect(mockGetOrder).toHaveBeenCalled();
    expect(updatedOrder).toEqual({
      ...orderWithErrors,
      errorCount: 0,
      lastTimeFetched: now,
      fetchErrorCount: 0,
    });
  });

  it('should return the same object if the minimum polling time has not passed', async () => {
    const lastTimeFetched = 1000;
    const pollingSecondsMinimum = 3;

    jest
      .spyOn(Date, 'now')
      .mockImplementation(
        () => lastTimeFetched + pollingSecondsMinimum * 1000 - 1,
      );
    const orderWithPollingSecondsMinimum = {
      ...mockOrder,
      lastTimeFetched,
      data: { ...mockOrder.data, pollingSecondsMinimum },
    };
    const updatedOrder = await processAggregatorOrder(
      orderWithPollingSecondsMinimum,
    );
    expect(mockGetOrder).not.toHaveBeenCalled();
    expect(updatedOrder).toEqual(orderWithPollingSecondsMinimum);
  });

  it('should return an updated object if the minimum polling time has passed', async () => {
    const lastTimeFetched = 1000;
    const pollingSecondsMinimum = 3;

    const now = lastTimeFetched + pollingSecondsMinimum * 1000 + 1;

    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
      pollingSecondsMinimum,
    }));

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const orderWithPollingSecondsMinimum = {
      ...mockOrder,
      lastTimeFetched,
      data: { ...mockOrder.data, pollingSecondsMinimum },
    };

    const updatedOrder = await processAggregatorOrder(
      orderWithPollingSecondsMinimum,
    );
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...orderWithPollingSecondsMinimum,
      errorCount: 0,
      lastTimeFetched: now,
      fetchErrorCount: 0,
    });
  });

  it('should return an updated object if the minimum polling time has not passed and processing was forced', async () => {
    const lastTimeFetched = 1000;
    const pollingSecondsMinimum = 3;

    const now = lastTimeFetched + pollingSecondsMinimum * 1000 - 1;

    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
      pollingSecondsMinimum,
    }));

    jest.spyOn(Date, 'now').mockImplementation(() => now);

    const orderWithPollingSecondsMinimum = {
      ...mockOrder,
      lastTimeFetched,
      data: { ...mockOrder.data, pollingSecondsMinimum },
    };
    const updatedOrder = await processAggregatorOrder(
      orderWithPollingSecondsMinimum,
      {
        forced: true,
      },
    );
    expect(mockGetOrder).toHaveBeenCalled();
    expect(updatedOrder).toEqual({
      ...orderWithPollingSecondsMinimum,
      errorCount: 0,
      lastTimeFetched: now,
      fetchErrorCount: 0,
    });
  });

  describe('fetch error backoff', () => {
    it('increments errorCount and sets lastTimeFetched when the order fetch fails', async () => {
      const fetchedAt = 1_700_000_000_000;
      jest.spyOn(Date, 'now').mockReturnValue(fetchedAt);
      mockGetOrder.mockImplementation(() => {
        throw new Error('provider removed');
      });

      const updatedOrder = await processAggregatorOrder({
        ...mockOrder,
        errorCount: 0,
        lastTimeFetched: 0,
      });

      expect(updatedOrder.errorCount).toBe(1);
      expect(updatedOrder.fetchErrorCount).toBe(1);
      expect(updatedOrder.lastTimeFetched).toBe(fetchedAt);
    });

    it('stops errorCount at MAX_ERROR_COUNT after repeated fetch errors', async () => {
      mockGetOrder.mockImplementation(() => {
        throw new Error('provider removed');
      });
      let order: FiatOrder = {
        ...mockOrder,
        errorCount: 0,
        lastTimeFetched: 0,
      };

      for (let attempt = 0; attempt < MAX_ERROR_COUNT + 1; attempt++) {
        const nextNow =
          (order.lastTimeFetched ?? 0) +
          Math.pow(POLLING_FRECUENCY_IN_SECONDS, (order.errorCount ?? 0) + 1) *
            1000 +
          1;
        jest.spyOn(Date, 'now').mockReturnValue(nextNow);

        order = await processAggregatorOrder(order);
      }

      expect(order.errorCount).toBe(MAX_ERROR_COUNT);
      expect(order.fetchErrorCount).toBe(MAX_ERROR_COUNT);
    });

    it('delays the next order fetch until the error backoff elapses', async () => {
      const start = 1_000_000;
      const pollingIntervalMs = POLLING_FREQUENCY;
      const backoffMs = Math.pow(POLLING_FRECUENCY_IN_SECONDS, 1 + 1) * 1000;
      const fetchTimestamps: number[] = [];
      const pollTimestamps: number[] = [];
      const frozenDateNow = Date.now;

      jest.spyOn(Date, 'now').mockRestore();
      Date.now = () => new Date().getTime();
      jest.useFakeTimers();
      jest.setSystemTime(start);

      try {
        mockGetOrder.mockImplementation(() => {
          const timestamp = Date.now();
          fetchTimestamps.push(timestamp);
          // eslint-disable-next-line no-console
          console.log(`[ramp-order-poll] fetch at ${timestamp}`);
          throw new Error('provider removed');
        });

        let order: FiatOrder = {
          ...mockOrder,
          errorCount: 0,
          lastTimeFetched: 0,
        };

        const tick = async () => {
          const timestamp = Date.now();
          pollTimestamps.push(timestamp);
          // eslint-disable-next-line no-console
          console.log(`[ramp-order-poll] tick at ${timestamp}`);
          order = await processAggregatorOrder(order);
        };

        await tick();

        let elapsed = 0;
        while (elapsed < backoffMs) {
          await jest.advanceTimersByTimeAsync(pollingIntervalMs);
          elapsed += pollingIntervalMs;
          await tick();
        }

        // eslint-disable-next-line no-console
        console.log(
          `[ramp-order-poll] fetch timestamps: ${fetchTimestamps.join(', ')}`,
        );
        // eslint-disable-next-line no-console
        console.log(
          `[ramp-order-poll] tick timestamps: ${pollTimestamps.join(', ')}`,
        );

        expect(fetchTimestamps).toEqual([start, start + backoffMs]);
        expect(fetchTimestamps[1] - fetchTimestamps[0]).toBeGreaterThan(
          pollingIntervalMs,
        );
      } finally {
        jest.useRealTimers();
        Date.now = frozenDateNow;
        mockGetOrder.mockReset();
      }
    });
  });

  describe('stop at MAX_ERROR_COUNT', () => {
    it('does not fetch once fetchErrorCount reaches MAX_ERROR_COUNT', async () => {
      const order = { ...mockOrder, fetchErrorCount: MAX_ERROR_COUNT };

      const updatedOrder = await processAggregatorOrder(order);

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(updatedOrder).toBe(order);
    });

    it('fetches at MAX_ERROR_COUNT when forced', async () => {
      mockGetOrder.mockImplementation(() => ({ ...mockOrder.data }));

      await processAggregatorOrder(
        { ...mockOrder, fetchErrorCount: MAX_ERROR_COUNT },
        { forced: true },
      );

      expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    });

    it('keeps polling a plain UNKNOWN order at errorCount MAX_ERROR_COUNT', async () => {
      mockGetOrder.mockImplementation(() => ({
        ...mockOrder.data,
        status: 'UNKNOWN',
      }));

      await processAggregatorOrder({
        ...mockOrder,
        errorCount: MAX_ERROR_COUNT,
        fetchErrorCount: 0,
        lastTimeFetched: 0,
      });

      expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    });

    it('resets fetchErrorCount on a successful reply', async () => {
      mockGetOrder.mockImplementation(() => ({ ...mockOrder.data }));

      const updatedOrder = await processAggregatorOrder({
        ...mockOrder,
        fetchErrorCount: MAX_ERROR_COUNT - 1,
      });

      expect(updatedOrder.fetchErrorCount).toBe(0);
    });
  });

  describe('provider removed', () => {
    const description = 'This provider is no longer available in MetaMask.';
    const pendingOrder = {
      ...mockOrder,
      state: 'PENDING',
      data: { ...mockOrder.data, status: 'PENDING' },
    } as FiatOrder;

    it('marks the order final from statusReason alone and keeps its stored data', async () => {
      jest.spyOn(Date, 'now').mockReturnValue(1673886669700);
      mockGetOrder.mockImplementation(() => ({
        id: 'test-id',
        status: 'PENDING',
        statusReason: 'PROVIDER_REMOVED',
        statusDescription: description,
        fiatAmount: 1,
        cryptoCurrency: { symbol: 'XYZ' },
        provider: { id: '/providers/other' },
      }));

      const updatedOrder = await processAggregatorOrder(pendingOrder);

      expect(updatedOrder).toEqual({
        ...pendingOrder,
        lastTimeFetched: 1673886669700,
        fetchErrorCount: 0,
        providerRemoved: true,
        statusDescription: description,
      });
    });

    it('marks the order final on a forced fetch that returns PROVIDER_REMOVED', async () => {
      mockGetOrder.mockImplementation(() => ({
        id: 'test-id',
        status: 'UNKNOWN',
        statusReason: 'PROVIDER_REMOVED',
        statusDescription: description,
      }));

      const updatedOrder = await processAggregatorOrder(pendingOrder, {
        forced: true,
      });

      expect(updatedOrder).toMatchObject({
        providerRemoved: true,
        state: pendingOrder.state,
        amount: pendingOrder.amount,
        cryptocurrency: pendingOrder.cryptocurrency,
        data: pendingOrder.data,
      });
    });

    it('does not fetch a provider-removed order, even when forced', async () => {
      const finalOrder = {
        ...pendingOrder,
        providerRemoved: true,
        statusDescription: description,
      };

      const updatedOrder = await processAggregatorOrder(finalOrder, {
        forced: true,
      });

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(updatedOrder).toBe(finalOrder);
    });
  });
});
