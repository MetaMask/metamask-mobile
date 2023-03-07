import { Order } from '@consensys/on-ramp-sdk';
import processOrder from '.';
import Logger from '../../../../util/Logger';
import { processAggregatorOrder } from './aggregator';
import { FiatOrder } from '../../../../reducers/fiatOrders/types';
import { FIAT_ORDER_PROVIDERS } from '../../../../constants/on-ramp';

const mockOrder1 = {
  id: 'test-id-1',
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: 1673886669608,
  amount: 123,
  fee: 9,
  cryptoAmount: 0.012361263,
  cryptoFee: 9,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'BTC',
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
  } as Order,
};

jest.mock('./aggregator', () => ({
  ...jest.requireActual('./aggregator'),
  processAggregatorOrder: jest.fn((order) => order),
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

describe('processOrder', () => {
  beforeEach(() => {
    (
      processAggregatorOrder as jest.MockedFunction<
        typeof processAggregatorOrder
      >
    ).mockClear();
  });

  it.each([
    FIAT_ORDER_PROVIDERS.WYRE_APPLE_PAY,
    FIAT_ORDER_PROVIDERS.TRANSAK,
    FIAT_ORDER_PROVIDERS.MOONPAY,
  ])('should return same order for provider %s', async (provider) => {
    const providerOrder = {
      ...mockOrder1,
      provider,
    };
    expect(await processOrder(providerOrder)).toBe(providerOrder);
  });

  it('should process aggregator order', async () => {
    expect(await processOrder(mockOrder1)).toBe(mockOrder1);
    expect(processAggregatorOrder).toHaveBeenCalledWith(mockOrder1);
  });

  it('should return the same order and log error if provider is not supported', async () => {
    const unsupportedProviderOrder = {
      ...mockOrder1,
      provider: FIAT_ORDER_PROVIDERS.WYRE,
    };
    expect(await processOrder(unsupportedProviderOrder)).toBe(
      unsupportedProviderOrder,
    );
    expect(Logger.error).toHaveBeenCalledWith(
      'FiatOrders::ProcessOrder unrecognized provider',
      unsupportedProviderOrder,
    );
  });
});
