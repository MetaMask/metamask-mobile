import { OrderOrderTypeEnum } from '@consensys/on-ramp-sdk/dist/API';
import {
  orderStatusToFiatOrderState,
  processUnifiedOrder,
  POLLING_FREQUENCY_IN_SECONDS,
  MAX_ERROR_COUNT,
} from './unifiedOrderProcessor';
import {
  FIAT_ORDER_STATES,
  FIAT_ORDER_PROVIDERS,
} from '../../../../constants/on-ramp';
import { FiatOrder } from '../../../../reducers/fiatOrders';

const mockGetOrder = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrder: (...args: unknown[]) => mockGetOrder(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockRampsOrder = {
  status: 'PENDING',
  provider: { id: '/providers/transak', name: 'Transak', links: [] },
  fiatCurrency: { symbol: 'USD', decimals: 2, denomSymbol: '$' },
  cryptoCurrency: { symbol: 'ETH', decimals: 18 },
  fiatAmount: 100,
  totalFeesFiat: 5,
  cryptoAmount: 0.05,
  walletAddress: '0xabc',
  network: { chainId: '1', name: 'Ethereum Mainnet' },
  createdAt: 1000000,
  txHash: '',
  excludeFromPurchases: false,
  orderType: 'BUY',
  providerOrderId: 'abc-123',
  providerOrderLink: 'https://transak.com/order/abc-123',
  paymentMethod: { id: '/payments/card', name: 'Card' },
  exchangeRate: 2000,
};

// V2-style order — ID uses /providers/{code}/orders/{id} format
const mockOrder: FiatOrder = {
  id: '/providers/transak/orders/abc-123',
  provider: FIAT_ORDER_PROVIDERS.AGGREGATOR,
  createdAt: 1000000,
  amount: 100,
  fee: 5,
  cryptoAmount: 0.05,
  cryptoFee: 5,
  currency: 'USD',
  currencySymbol: '$',
  cryptocurrency: 'ETH',
  state: FIAT_ORDER_STATES.PENDING,
  account: '0xabc',
  network: '1',
  excludeFromPurchases: false,
  orderType: OrderOrderTypeEnum.Buy,
  errorCount: 0,
  lastTimeFetched: 0,
  data: {
    provider: { id: '/providers/transak', name: 'Transak' },
    fiatCurrency: { id: 'USD', symbol: 'USD', denomSymbol: '$', decimals: 2 },
    cryptoCurrency: { id: 'ETH', symbol: 'ETH', decimals: 18 },
  } as FiatOrder['data'],
};

describe('orderStatusToFiatOrderState', () => {
  it.each([
    ['COMPLETED', FIAT_ORDER_STATES.COMPLETED],
    ['FAILED', FIAT_ORDER_STATES.FAILED],
    ['CANCELLED', FIAT_ORDER_STATES.CANCELLED],
    ['CREATED', FIAT_ORDER_STATES.CREATED],
    ['PENDING', FIAT_ORDER_STATES.PENDING],
    ['UNKNOWN', FIAT_ORDER_STATES.PENDING],
    ['SOME_FUTURE_STATUS', FIAT_ORDER_STATES.PENDING],
  ])('maps %s to %s', (status, expected) => {
    expect(orderStatusToFiatOrderState(status)).toBe(expected);
  });
});

describe('processUnifiedOrder', () => {
  const now = 1673886669608;

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
    mockGetOrder.mockResolvedValue({ ...mockRampsOrder });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mockGetOrder.mockClear();
    (
      jest.requireMock('../../../../util/Logger').error as jest.Mock
    ).mockClear();
  });

  describe('successful poll', () => {
    it('calls Engine.getOrder with provider code, order code, and account from V2-style ID', async () => {
      await processUnifiedOrder(mockOrder);
      expect(mockGetOrder).toHaveBeenCalledWith('transak', 'abc-123', '0xabc');
    });

    it('calls Engine.getOrder with normalised provider code for aggregator-style orders (provider in data)', async () => {
      const aggregatorOrder: FiatOrder = {
        ...mockOrder,
        id: 'order-abc-999',
        data: {
          provider: { id: '/providers/moonpay', name: 'MoonPay' },
        } as FiatOrder['data'],
      };
      await processUnifiedOrder(aggregatorOrder);
      expect(mockGetOrder).toHaveBeenCalledWith(
        'moonpay',
        'order-abc-999',
        '0xabc',
      );
    });

    it('calls Engine.getOrder with provider code from plain string provider in data', async () => {
      const order: FiatOrder = {
        ...mockOrder,
        id: 'order-plain-123',
        data: { provider: { id: 'moonpay' } } as FiatOrder['data'],
      };
      await processUnifiedOrder(order);
      expect(mockGetOrder).toHaveBeenCalledWith(
        'moonpay',
        'order-plain-123',
        '0xabc',
      );
    });

    it('returns order with updated state and reset errorCount on success', async () => {
      mockGetOrder.mockResolvedValue({
        ...mockRampsOrder,
        status: 'COMPLETED',
      });

      const result = await processUnifiedOrder({ ...mockOrder, errorCount: 2 });

      expect(result.state).toBe(FIAT_ORDER_STATES.COMPLETED);
      expect(result.errorCount).toBe(0);
      expect(result.lastTimeFetched).toBe(now);
    });

    it('maps all non-terminal statuses through the full pipeline', async () => {
      for (const [apiStatus, expectedState] of [
        ['COMPLETED', FIAT_ORDER_STATES.COMPLETED],
        ['FAILED', FIAT_ORDER_STATES.FAILED],
        ['CANCELLED', FIAT_ORDER_STATES.CANCELLED],
        ['CREATED', FIAT_ORDER_STATES.CREATED],
        ['PENDING', FIAT_ORDER_STATES.PENDING],
      ] as const) {
        mockGetOrder.mockResolvedValue({
          ...mockRampsOrder,
          status: apiStatus,
        });
        const result = await processUnifiedOrder(mockOrder);
        expect(result.state).toBe(expectedState);
      }
    });

    it('preserves original network when API returns empty network chainId', async () => {
      mockGetOrder.mockResolvedValue({
        ...mockRampsOrder,
        network: { chainId: '', name: '' },
      });

      const result = await processUnifiedOrder({
        ...mockOrder,
        network: '137',
      });

      expect(result.network).toBe('137');
    });

    it('preserves original account when API returns empty walletAddress', async () => {
      mockGetOrder.mockResolvedValue({ ...mockRampsOrder, walletAddress: '' });

      const result = await processUnifiedOrder({
        ...mockOrder,
        account: '0xoriginal',
      });

      expect(result.account).toBe('0xoriginal');
    });

    it('uses API-provided network when original network is empty', async () => {
      mockGetOrder.mockResolvedValue({
        ...mockRampsOrder,
        network: { chainId: '137', name: 'Polygon' },
      });

      const result = await processUnifiedOrder({ ...mockOrder, network: '' });

      expect(result.network).toBe('137');
    });

    it('preserves the original order ID (does not overwrite with transformed ID)', async () => {
      const result = await processUnifiedOrder(mockOrder);
      expect(result.id).toBe(mockOrder.id);
    });
  });

  describe('error handling', () => {
    it('returns original order unchanged and logs error when API returns null', async () => {
      const Logger = jest.requireMock<{ error: jest.Mock }>(
        '../../../../util/Logger',
      );
      mockGetOrder.mockResolvedValue(null);

      const result = await processUnifiedOrder(mockOrder);

      expect(result).toBe(mockOrder);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('returns original order unchanged and logs error when API throws', async () => {
      const Logger = jest.requireMock<{ error: jest.Mock }>(
        '../../../../util/Logger',
      );
      mockGetOrder.mockRejectedValue(new Error('network error'));

      const result = await processUnifiedOrder(mockOrder);

      expect(result).toBe(mockOrder);
      expect(Logger.error).toHaveBeenCalled();
    });

    it('returns original order and logs error when provider/order code cannot be extracted', async () => {
      const Logger = jest.requireMock<{ error: jest.Mock }>(
        '../../../../util/Logger',
      );
      const badOrder: FiatOrder = {
        ...mockOrder,
        id: 'non-path-id',
        data: {} as FiatOrder['data'],
      };

      const result = await processUnifiedOrder(badOrder);

      expect(result).toBe(badOrder);
      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('exponential backoff', () => {
    it('skips poll and returns same order reference when within backoff window', async () => {
      const lastTimeFetched = 1000;
      const errorCount = 3;
      const withinBackoff =
        lastTimeFetched +
        Math.pow(POLLING_FREQUENCY_IN_SECONDS, errorCount + 1) * 1000 -
        1;
      jest.spyOn(Date, 'now').mockReturnValue(withinBackoff);

      const orderWithErrors = { ...mockOrder, lastTimeFetched, errorCount };
      const result = await processUnifiedOrder(orderWithErrors);

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(result).toBe(orderWithErrors);
    });

    it('polls when backoff window has passed', async () => {
      const lastTimeFetched = 1000;
      const errorCount = 3;
      const pastBackoff =
        lastTimeFetched +
        Math.pow(POLLING_FREQUENCY_IN_SECONDS, errorCount + 1) * 1000 +
        1;
      jest.spyOn(Date, 'now').mockReturnValue(pastBackoff);

      const result = await processUnifiedOrder({
        ...mockOrder,
        lastTimeFetched,
        errorCount,
      });

      expect(mockGetOrder).toHaveBeenCalled();
      expect(result.errorCount).toBe(0);
    });

    it('bypasses backoff window when forced', async () => {
      const lastTimeFetched = 1000;
      const errorCount = 3;
      const withinBackoff =
        lastTimeFetched +
        Math.pow(POLLING_FREQUENCY_IN_SECONDS, errorCount + 1) * 1000 -
        1;
      jest.spyOn(Date, 'now').mockReturnValue(withinBackoff);

      const result = await processUnifiedOrder(
        { ...mockOrder, lastTimeFetched, errorCount },
        { forced: true },
      );

      expect(mockGetOrder).toHaveBeenCalled();
      expect(result.errorCount).toBe(0);
    });
  });

  describe('pollingSecondsMinimum', () => {
    const orderWithPolling = (
      pollingSecondsMinimum: number,
      lastTimeFetched: number,
    ): FiatOrder => ({
      ...mockOrder,
      lastTimeFetched,
      data: {
        ...(mockOrder.data as object),
        pollingSecondsMinimum,
      } as FiatOrder['data'],
    });

    it('skips poll when pollingSecondsMinimum has not elapsed', async () => {
      const lastTimeFetched = 1000;
      const pollingSecondsMinimum = 30;
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(lastTimeFetched + pollingSecondsMinimum * 1000 - 1);

      const order = orderWithPolling(pollingSecondsMinimum, lastTimeFetched);
      const result = await processUnifiedOrder(order);

      expect(mockGetOrder).not.toHaveBeenCalled();
      expect(result).toBe(order);
    });

    it('polls when pollingSecondsMinimum has elapsed', async () => {
      const lastTimeFetched = 1000;
      const pollingSecondsMinimum = 30;
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(lastTimeFetched + pollingSecondsMinimum * 1000 + 1);

      const result = await processUnifiedOrder(
        orderWithPolling(pollingSecondsMinimum, lastTimeFetched),
      );

      expect(mockGetOrder).toHaveBeenCalled();
      expect(result.errorCount).toBe(0);
    });

    it('bypasses pollingSecondsMinimum window when forced', async () => {
      const lastTimeFetched = 1000;
      const pollingSecondsMinimum = 30;
      jest
        .spyOn(Date, 'now')
        .mockReturnValue(lastTimeFetched + pollingSecondsMinimum * 1000 - 1);

      await processUnifiedOrder(
        orderWithPolling(pollingSecondsMinimum, lastTimeFetched),
        { forced: true },
      );

      expect(mockGetOrder).toHaveBeenCalled();
    });
  });

  describe('UNKNOWN status handling', () => {
    it('increments errorCount and returns same order on UNKNOWN status', async () => {
      mockGetOrder.mockResolvedValue({ ...mockRampsOrder, status: 'UNKNOWN' });

      const result = await processUnifiedOrder({ ...mockOrder, errorCount: 2 });

      expect(result.errorCount).toBe(3);
      expect(result.lastTimeFetched).toBe(now);
    });

    it('caps errorCount at MAX_ERROR_COUNT on repeated UNKNOWN status', async () => {
      mockGetOrder.mockResolvedValue({ ...mockRampsOrder, status: 'UNKNOWN' });

      const result = await processUnifiedOrder({
        ...mockOrder,
        errorCount: MAX_ERROR_COUNT,
      });

      expect(result.errorCount).toBe(MAX_ERROR_COUNT);
    });

    it('processes UNKNOWN status normally when forced (no early-return)', async () => {
      mockGetOrder.mockResolvedValue({ ...mockRampsOrder, status: 'UNKNOWN' });

      const result = await processUnifiedOrder(
        { ...mockOrder, errorCount: 0 },
        { forced: true },
      );

      // forced skips the UNKNOWN early-return, so the order is transformed and errorCount resets
      expect(result.errorCount).toBe(0);
      expect(result.state).toBe(FIAT_ORDER_STATES.PENDING);
    });
  });
});
