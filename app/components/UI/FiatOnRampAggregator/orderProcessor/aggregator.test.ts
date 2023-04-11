import { Order } from '@consensys/on-ramp-sdk';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import {
  aggregatorOrderToFiatOrder,
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
          chainId: 1,
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
    expect(aggregatorOrderToFiatOrder(mockOrder2 as Order)).toEqual({
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

jest.mock('../sdk', () => ({
  SDK: {
    orders: () => ({
      getOrder: mockGetOrder,
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
      data: { ...mockOrder.data, status: 'FAILED' },
    });
  });

  it('should return the same order if response is empty', async () => {
    mockGetOrder.mockImplementation(() => null);
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(mockGetOrder).toHaveReturnedWith(null);
    expect(updatedOrder).toEqual(mockOrder);
  });

  it('should return the same order if there was an error', async () => {
    mockGetOrder.mockImplementation(() => {
      throw new Error('test error');
    });
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual(mockOrder);
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
    });
  });
});
