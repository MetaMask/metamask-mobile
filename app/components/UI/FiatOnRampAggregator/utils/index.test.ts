import { Order } from '@consensys/on-ramp-sdk';
import {
  timeToDescription,
  TimeDescriptions,
  formatAmount,
  formatId,
  isNetworkBuySupported,
  isNetworkBuyNativeTokenSupported,
  getOrderAmount,
} from '.';
import { FiatOrder } from '../../../../reducers/fiatOrders/types';

describe('timeToDescription', () => {
  it('should return a function', () => {
    expect(timeToDescription).toBeInstanceOf(Function);
  });
  it.each`
    lower   | upper   | result
    ${0}    | ${0}    | ${[TimeDescriptions.instant]}
    ${0}    | ${3000} | ${[TimeDescriptions.less_than, '2', TimeDescriptions.business_days]}
    ${60}   | ${120}  | ${['1', TimeDescriptions.separator, '2', TimeDescriptions.hours]}
    ${0}    | ${1}    | ${[TimeDescriptions.less_than, '1', TimeDescriptions.minute]}
    ${0}    | ${1440} | ${[TimeDescriptions.less_than, '1', TimeDescriptions.business_day]}
    ${0}    | ${60}   | ${[TimeDescriptions.less_than, '1', TimeDescriptions.hour]}
    ${0}    | ${120}  | ${[TimeDescriptions.less_than, '2', TimeDescriptions.hours]}
    ${0}    | ${1}    | ${[TimeDescriptions.less_than, '1', TimeDescriptions.minute]}
    ${0}    | ${0.5}  | ${[TimeDescriptions.less_than, '0.5', TimeDescriptions.minutes]}
    ${30}   | ${120}  | ${['30', TimeDescriptions.separator, '120', TimeDescriptions.minutes]}
    ${120}  | ${240}  | ${['2', TimeDescriptions.separator, '4', TimeDescriptions.hours]}
    ${1500} | ${1600} | ${['1', TimeDescriptions.separator, '1', TimeDescriptions.business_days]}
  `(
    'should return correct time description for range',
    ({ lower, upper, result }) => {
      expect(timeToDescription([lower, upper])).toStrictEqual(result);
    },
  );
});

describe('formatAmount', () => {
  it('should format amount', () => {
    jest.spyOn(Intl, 'NumberFormat').mockImplementation(
      () =>
        ({
          format: jest.fn().mockImplementation(() => '123,123'),
        } as any),
    );
    expect(formatAmount(123123)).toBe('123,123');
    jest.spyOn(Intl, 'NumberFormat').mockClear();
  });

  it('should return input amount as string if Intl throws', () => {
    jest.spyOn(Intl, 'NumberFormat').mockImplementation(
      () =>
        ({
          format: jest.fn().mockImplementation(() => {
            throw Error();
          }),
        } as any),
    );
    expect(formatAmount(123123)).toBe('123123');
    jest.spyOn(Intl, 'NumberFormat').mockClear();
  });

  it('should return input amount as string if Intl is not defined', () => {
    const globalIntl = global.Intl;
    global.Intl = undefined as unknown as typeof Intl;
    expect(formatAmount(123123)).toBe('123123');
    global.Intl = globalIntl;
  });
});

describe('formatId', () => {
  it('should return id with leading slash', () => {
    expect(formatId('id')).toBe('/id');
    expect(formatId('/id')).toBe('/id');
  });
  it('should empty string if passed an empty string', () => {
    expect(formatId('')).toBe('');
  });
});

describe('isNetworkBuySupported', () => {
  it('should return true if network is supported', () => {
    expect(
      isNetworkBuySupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported', () => {
    expect(
      isNetworkBuySupported('1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found', () => {
    expect(
      isNetworkBuySupported('22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(false);
  });
});

describe('isNetworkBuyNativeTokenSupported', () => {
  it('should return true if network is supported and native token is supported', () => {
    expect(
      isNetworkBuyNativeTokenSupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported', () => {
    expect(
      isNetworkBuyNativeTokenSupported('1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found', () => {
    expect(
      isNetworkBuyNativeTokenSupported('22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
        },
      ]),
    ).toBe(false);
  });

  it('should return false if network is supported but native token is not supported', () => {
    expect(
      isNetworkBuyNativeTokenSupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: false,
        },
      ]),
    ).toBe(false);
  });
});

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
  it('should render "..." when cryptoAmount is 0', () => {
    expect(getOrderAmount(mockOrder)).toBe('...');
  });

  it('should render correctly when data is provided. ', () => {
    expect(
      getOrderAmount({
        ...mockOrder,
        cryptoAmount: 0.012361263,
      }),
    ).toBe('0.01236');
  });

  it('should render correctly when decimals is not provided. ', () => {
    expect(
      getOrderAmount({
        ...mockOrder,
        cryptoAmount: 0.012361263,
        data: {
          ...mockOrder.data,
          cryptoCurrency: undefined as any,
        },
      }),
    ).toBe('0.01236');
  });
});
