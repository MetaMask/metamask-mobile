import {
  Order,
  QuoteResponse,
  SellQuoteResponse,
} from '@consensys/on-ramp-sdk';
import {
  AggregatorNetwork,
  OrderOrderTypeEnum,
} from '@consensys/on-ramp-sdk/dist/API';
import {
  timeToDescription,
  TimeDescriptions,
  formatAmount,
  formatId,
  isNetworkRampSupported,
  isNetworkRampNativeTokenSupported,
  getOrderAmount,
  isBuyQuotes,
  isSellQuotes,
  isBuyQuote,
  isSellQuote,
  isSellOrder,
  isSellFiatOrder,
  getNotificationDetails,
  stateHasOrder,
} from '.';
import { FIAT_ORDER_STATES } from '../../../../constants/on-ramp';
import { FiatOrder, RampType } from '../../../../reducers/fiatOrders/types';
import { getOrders } from '../../../../reducers/fiatOrders';
import type { RootState } from '../../../../reducers';

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
  // TODO(ramp, chainId-string): remove tests with chainId as number once it's a string
  it('should return true if network is supported', () => {
    expect(
      isNetworkRampSupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(true);

    expect(
      isNetworkRampSupported('1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported', () => {
    expect(
      isNetworkRampSupported('1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampSupported('1', [
        {
          active: false,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found', () => {
    expect(
      isNetworkRampSupported('22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampSupported('22', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return true if network is supported when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampSupported('0x1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(true);
    expect(
      isNetworkRampSupported('0x1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampSupported('0x1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampSupported('0x1', [
        {
          active: false,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampSupported('0x22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampSupported('0x22', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });
});

describe('isNetworkBuyNativeTokenSupported', () => {
  // TODO(ramp, chainId-string): remove tests with chainId as number once it's a string
  it('should return true if network is supported and native token is supported', () => {
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(true);
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported', () => {
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: false,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found', () => {
    expect(
      isNetworkRampNativeTokenSupported('22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('22', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is supported but native token is not supported', () => {
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: false,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: false,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return true if network is supported and native token is supported  when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(true);
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(true);
  });

  it('should return false if network is not supported when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: false,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: false,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is not found when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampNativeTokenSupported('0x22', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('0x22', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: true,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
      ]),
    ).toBe(false);
  });

  it('should return false if network is supported but native token is not supported when chainId is on hexadecimal format', () => {
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: true,
          chainId: 1,
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: false,
          shortName: 'Ethereum',
        },
      ]),
    ).toBe(false);
    expect(
      isNetworkRampNativeTokenSupported('0x1', [
        {
          active: true,
          chainId: '1',
          chainName: 'Ethereum Mainnet',
          nativeTokenSupported: false,
          shortName: 'Ethereum',
        } as unknown as AggregatorNetwork,
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
  it('should render "..." when cryptoAmount is 0', () => {
    expect(getOrderAmount(mockOrder)).toBe('...');
  });

  it('render matches latest snapshot when data is provided. ', () => {
    expect(
      getOrderAmount({
        ...mockOrder,
        cryptoAmount: 0.012361263,
      }),
    ).toBe('0.01236');
  });

  it('render matches latest snapshot when decimals is not provided. ', () => {
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

describe('Type assertion functions', () => {
  describe('isBuyQuotes', () => {
    it('should return true if rampType is BUY', () => {
      expect(isBuyQuotes([], RampType.BUY)).toBe(true);
    });

    it('should return false if rampType is SELL', () => {
      expect(isBuyQuotes([], RampType.SELL)).toBe(false);
    });
  });

  describe('isSellQuotes', () => {
    it('should return true if rampType is SELL', () => {
      expect(isSellQuotes([], RampType.SELL)).toBe(true);
    });

    it('should return false if rampType is BUY', () => {
      expect(isSellQuotes([], RampType.BUY)).toBe(false);
    });
  });

  describe('isBuyQuote', () => {
    it('should return true if rampType is BUY', () => {
      expect(
        isBuyQuote({} as QuoteResponse | SellQuoteResponse, RampType.BUY),
      ).toBe(true);
    });

    it('should return false if rampType is SELL', () => {
      expect(
        isBuyQuote({} as QuoteResponse | SellQuoteResponse, RampType.SELL),
      ).toBe(false);
    });
  });

  describe('isSellQuote', () => {
    it('should return true if rampType is SELL', () => {
      expect(
        isSellQuote({} as QuoteResponse | SellQuoteResponse, RampType.SELL),
      ).toBe(true);
    });

    it('should return false if rampType is BUY', () => {
      expect(
        isSellQuote({} as QuoteResponse | SellQuoteResponse, RampType.BUY),
      ).toBe(false);
    });
  });

  describe('isSellOrder', () => {
    it('should return true if orderType is SELL', () => {
      expect(isSellOrder({ orderType: 'SELL' } as Order)).toBe(true);
    });

    it('should return false if orderType is BUY', () => {
      expect(isSellOrder({ orderType: 'BUY' } as Order)).toBe(false);
    });
  });

  describe('isSellFiatOrder', () => {
    it('should return true if orderType is SELL', () => {
      expect(isSellFiatOrder({ orderType: 'SELL' } as FiatOrder)).toBe(true);
    });

    it('should return false if orderType is BUY', () => {
      expect(isSellFiatOrder({ orderType: 'BUY' } as FiatOrder)).toBe(false);
    });
  });
});

describe('getNotificationDetails', () => {
  const mockOrder = {
    state: FIAT_ORDER_STATES.PENDING,
    orderType: OrderOrderTypeEnum.Buy,
    cryptocurrency: 'ETH',
    cryptoAmount: '0.01',
  } as FiatOrder;

  const mockSellOrder = {
    ...mockOrder,
    orderType: OrderOrderTypeEnum.Sell,
  };

  it('should return correct details for buy orders', () => {
    const pendingDetails = getNotificationDetails(mockOrder);
    expect(pendingDetails).toMatchInlineSnapshot(`
      {
        "description": "This should only take a few minutes...",
        "duration": 5000,
        "status": "pending",
        "title": "Processing your purchase of ETH",
      }
    `);
    const cancelledDetails = getNotificationDetails({
      ...mockOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    });
    expect(cancelledDetails).toMatchInlineSnapshot(`
      {
        "description": "Verify your payment method and card support",
        "duration": 5000,
        "status": "cancelled",
        "title": "Your purchase was cancelled",
      }
    `);
    const failedDetails = getNotificationDetails({
      ...mockOrder,
      state: FIAT_ORDER_STATES.FAILED,
    });
    expect(failedDetails).toMatchInlineSnapshot(`
      {
        "description": "Verify your payment method and card support",
        "duration": 5000,
        "status": "error",
        "title": "Purchase of ETH has failed! Please try again, sorry for the inconvenience!",
      }
    `);

    const completedDetails = getNotificationDetails({
      ...mockOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
    });
    expect(completedDetails).toMatchInlineSnapshot(`
      {
        "description": "Your ETH is now available",
        "duration": 5000,
        "status": "success",
        "title": "Your purchase of 0.01 ETH was successful!",
      }
    `);
  });

  it('should return correct details for sell orders', () => {
    const pendingDetails = getNotificationDetails(mockSellOrder);
    expect(pendingDetails).toMatchInlineSnapshot(`
      {
        "description": "Your order is now being processed.",
        "duration": 5000,
        "status": "pending",
        "title": "ETH sale processing",
      }
    `);
    const cancelledDetails = getNotificationDetails({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.CANCELLED,
    });
    expect(cancelledDetails).toMatchInlineSnapshot(`
      {
        "description": "Your order couldn´t be completed.",
        "duration": 5000,
        "status": "cancelled",
        "title": "Order cancelled",
      }
    `);
    const failedDetails = getNotificationDetails({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.FAILED,
    });
    expect(failedDetails).toMatchInlineSnapshot(`
      {
        "description": "Your order couldn´t be completed.",
        "duration": 5000,
        "status": "error",
        "title": "Order failed",
      }
    `);

    const completedDetails = getNotificationDetails({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.COMPLETED,
    });
    expect(completedDetails).toMatchInlineSnapshot(`
      {
        "description": "Your order was successful!.",
        "duration": 5000,
        "status": "success",
        "title": "Order completed",
      }
    `);
    const createdDetails = getNotificationDetails({
      ...mockSellOrder,
      state: FIAT_ORDER_STATES.CREATED,
    });
    expect(createdDetails).toMatchInlineSnapshot(`null`);
  });
});

jest.mock('../../../../reducers/fiatOrders', () => ({
  getOrders: jest.fn(),
}));

describe('stateHasOrder', () => {
  it('should return true if state has order', () => {
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValueOnce([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ] as FiatOrder[]);
    expect(stateHasOrder({} as RootState, { id: '1' } as FiatOrder)).toBe(true);
  });

  it('should return false if state does not have the order', () => {
    (getOrders as jest.MockedFunction<typeof getOrders>).mockReturnValueOnce([
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ] as FiatOrder[]);
    expect(stateHasOrder({} as RootState, { id: '4' } as FiatOrder)).toBe(
      false,
    );
  });
});
