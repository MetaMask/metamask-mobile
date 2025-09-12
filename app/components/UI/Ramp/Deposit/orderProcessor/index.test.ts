import { FiatOrder } from '../../../../../reducers/fiatOrders';
import { DepositSDKNoAuth } from '../sdk';
import { depositOrderToFiatOrder, processDepositOrder } from './';
import { DepositOrder, NativeRampsSdk } from '@consensys/native-ramps-sdk';

jest.mock('../sdk', () => ({
  DepositSDKNoAuth: {
    getOrder: jest.fn(),
  },
}));

describe('depositOrderToFiatOrder', () => {
  const now = 1673886669608;
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockImplementation(() => now);
  });

  afterAll(() => {
    jest.spyOn(Date, 'now').mockRestore();
  });

  it('should return a fiat order', () => {
    const mockOrder: Partial<DepositOrder> = {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      totalFeesFiat: 9,
      cryptoAmount: 0.012361263,
      cryptoCurrency: 'BTC',
      fiatCurrency: 'USD',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT' as DepositOrder['orderType'],
      walletAddress: '0x1234',
      txHash: '0x987654321',
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

    expect(depositOrderToFiatOrder(mockOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'COMPLETED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder,
    });

    expect(depositOrderToFiatOrder(failedOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'FAILED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: failedOrder,
    });
    expect(depositOrderToFiatOrder(cancelledOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'CANCELLED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: cancelledOrder,
    });
    expect(depositOrderToFiatOrder(pendingOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'PENDING',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: pendingOrder,
    });

    expect(depositOrderToFiatOrder(createdOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'CREATED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'SELL',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: createdOrder,
    });

    expect(depositOrderToFiatOrder(unknownStateOrder as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      fee: 9,
      cryptoAmount: 0.012361263,
      cryptoFee: 9,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'BTC',
      state: 'PENDING',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: unknownStateOrder,
    });
  });

  it('should return a fiat order with default values', () => {
    const mockOrder1: Partial<DepositOrder> = {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      cryptoCurrency: 'ETH',
      fiatCurrency: 'USD',
      fiatAmount: 123,
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT' as DepositOrder['orderType'],
      walletAddress: '0x1234',
      txHash: '0x987654321',
    };

    const mockOrder2 = {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      cryptoCurrency: 'ETH',
      fiatCurrency: 'USD',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234',
      txHash: '0x987654321',
    };

    expect(depositOrderToFiatOrder(mockOrder1 as DepositOrder)).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      cryptoAmount: 0,
      cryptoFee: 0,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'ETH',
      state: 'COMPLETED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder1,
    });
    expect(
      depositOrderToFiatOrder(mockOrder2 as unknown as DepositOrder),
    ).toEqual({
      id: 'test-id',
      provider: 'DEPOSIT',
      createdAt: 1673886669608,
      amount: 123,
      cryptoAmount: 0,
      cryptoFee: 0,
      currency: 'USD',
      currencySymbol: '',
      cryptocurrency: 'ETH',
      state: 'COMPLETED',
      account: '0x1234',
      network: 'eip155:1',
      txHash: '0x987654321',
      excludeFromPurchases: false,
      orderType: 'DEPOSIT',
      errorCount: 0,
      lastTimeFetched: 1673886669608,
      data: mockOrder2,
    });
  });
});

describe('processDepositOrder', () => {
  const mockOrder = {
    id: 'test-id',
    provider: 'DEPOSIT',
    createdAt: 1673886669608,
    amount: 123,
    fee: 9,
    cryptoAmount: 0.012361263,
    cryptoFee: 9,
    currency: 'USD',
    currencySymbol: '',
    cryptocurrency: 'BTC',
    state: 'COMPLETED',
    account: '0x1234',
    network: 'eip155:1',
    txHash: '0x987654321',
    excludeFromPurchases: false,
    orderType: 'DEPOSIT',
    errorCount: 0,
    lastTimeFetched: 1673886669600,
    data: {
      id: 'test-id',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      totalFeesFiat: 9,
      cryptoAmount: 0.012361263,
      cryptoCurrency: 'BTC',
      fiatCurrency: 'USD',
      network: 'ethreum',
      status: 'COMPLETED',
      orderType: 'DEPOSIT',
      walletAddress: '0x1234',
      txHash: '0x987654321',
    },
  } as FiatOrder;

  afterEach(() => {
    jest.spyOn(Date, 'now').mockClear();
    (DepositSDKNoAuth.getOrder as jest.Mock).mockClear();
  });

  it('should process an order', async () => {
    (DepositSDKNoAuth.getOrder as jest.Mock).mockImplementation(() => ({
      ...mockOrder.data,
      status: 'FAILED',
    }));
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processDepositOrder(mockOrder);
    expect(DepositSDKNoAuth.getOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual({
      ...mockOrder,
      state: 'FAILED',
      lastTimeFetched: 1673886669600,
      data: { ...mockOrder.data, status: 'FAILED' },
    });
  });

  it('should return the same order if response is empty', async () => {
    (DepositSDKNoAuth.getOrder as jest.Mock).mockImplementation(() => null);
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processDepositOrder(mockOrder);
    expect(DepositSDKNoAuth.getOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(DepositSDKNoAuth.getOrder).toHaveReturnedWith(null);
    expect(updatedOrder).toEqual(mockOrder);
  });

  it('should return the same order if there was an error', async () => {
    (DepositSDKNoAuth.getOrder as jest.Mock).mockImplementation(() => {
      throw new Error('test error');
    });
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processDepositOrder(mockOrder);
    expect(DepositSDKNoAuth.getOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(updatedOrder).toEqual(mockOrder);
  });

  it('should use provided SDK instance when available', async () => {
    const mockSdk = {
      getOrder: jest.fn().mockImplementation(() => ({
        ...mockOrder.data,
        status: 'PENDING',
      })),
    } as unknown as NativeRampsSdk;
    jest.spyOn(Date, 'now').mockImplementation(() => 1673886669600);

    const updatedOrder = await processDepositOrder(mockOrder, { sdk: mockSdk });
    expect(mockSdk.getOrder).toHaveBeenCalledWith('test-id', '0x1234');
    expect(DepositSDKNoAuth.getOrder).not.toHaveBeenCalled();
    expect(updatedOrder).toEqual({
      ...mockOrder,
      state: 'PENDING',
      lastTimeFetched: 1673886669600,
      data: { ...mockOrder.data, status: 'PENDING' },
    });
  });
});
