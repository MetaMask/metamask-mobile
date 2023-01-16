import { Order } from '@consensys/on-ramp-sdk';
import {
  aggregatorInitialFiatOrder,
  aggregatorOrderToFiatOrder,
  processAggregatorOrder,
} from './aggregator';

describe('aggregatorInitialFiatOrder', () => {
  it('should return an initial aggregator fiat order', () => {
    jest.spyOn(Date, 'now').mockImplementationOnce(() => 1233123123);
    expect(
      aggregatorInitialFiatOrder({
        id: 'test-id',
        account: '0x1235',
        network: '1',
      }),
    ).toEqual({
      id: 'test-id',
      account: '0x1235',
      network: '1',
      state: 'PENDING',
      provider: 'AGGREGATOR',
      createdAt: 1233123123,
      amount: null,
      fee: null,
      currency: '',
      cryptoAmount: null,
      cryptocurrency: '',
      data: null,
    });
  });
});

describe('aggregatorOrderToFiatOrder', () => {
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
  afterEach(() => {
    mockGetOrder.mockClear();
  });

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
  };

  it('should process an order', async () => {
    mockGetOrder.mockImplementation(() => ({
      ...mockOrder.data,
      status: 'FAILED',
    }));
    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...mockOrder,
      state: 'FAILED',
      data: { ...mockOrder.data, status: 'FAILED' },
    });
  });

  it('should return the same order if response is empty', async () => {
    mockGetOrder.mockImplementation(() => null);
    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(mockGetOrder).toHaveReturnedWith(null);
    expect(updatedOrder).toEqual(mockOrder);
  });

  it('should return the same order if there was an error', async () => {
    mockGetOrder.mockImplementation(() => {
      throw new Error('test error');
    });
    const updatedOrder = await processAggregatorOrder(mockOrder);
    expect(mockGetOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual(mockOrder);
  });
});
