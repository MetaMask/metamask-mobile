import { Order, OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import { FiatOrder } from '../../../../reducers/fiatOrders';
import { getOrderAmount } from './getOrderAmount';

describe('getOrderAmount', () => {
  const mockOrder = {
    id: 'test-id-1',
    provider: 'AGGREGATOR' as FiatOrder['provider'],
    createdAt: 1673886669608,
    amount: 123,
    fee: 9,
    cryptoAmount: 0,
    cryptoFee: 9,
    currency: 'USD',
    currencySymbol: '$',
    cryptocurrency: 'ETH',
    state: 'COMPLETED' as FiatOrder['state'],
    account: '0x1234',
    network: '1',
    txHash: '0x987654321',
    excludeFromPurchases: false,
    orderType: OrderOrderTypeEnum.Buy,
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
        symbol: 'ETH',
        decimals: 18,
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
    } as Order,
  };

  it('renders "..." when cryptoAmount is 0', () => {
    expect(getOrderAmount(mockOrder)).toBe('...');
  });

  it('renders formatted amount when data is provided', () => {
    expect(
      getOrderAmount({
        ...mockOrder,
        cryptoAmount: 0.012361263,
      }),
    ).toBe('0.01236');
  });

  it('renders number when decimals is not provided', () => {
    expect(
      getOrderAmount({
        ...mockOrder,
        cryptoAmount: 0.012361263,
        data: {
          ...mockOrder.data,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cryptoCurrency: undefined as any,
        },
      }),
    ).toBe('0.01236');
  });
});
