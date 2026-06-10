import {
  RampsOrderStatus as Status,
  type RampsOrder,
} from '@metamask/ramps-controller';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import { handleOrderStatusChangedForMetrics } from './analytics';

const mockTrackEvent = jest.fn();

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../../Analytics', () => ({
  MetaMetricsEvents: {
    ONRAMP_PURCHASE_CANCELLED: { category: 'On-ramp Purchase Cancelled' },
    OFFRAMP_PURCHASE_COMPLETED: { category: 'Off-ramp Purchase Completed' },
    OFFRAMP_PURCHASE_FAILED: { category: 'Off-ramp Purchase Failed' },
    OFFRAMP_PURCHASE_CANCELLED: { category: 'Off-ramp Purchase Cancelled' },
    RAMPS_TRANSACTION_COMPLETED: { category: 'Ramps Transaction Completed' },
    RAMPS_TRANSACTION_FAILED: { category: 'Ramps Transaction Failed' },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: true,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com',
  createdAt: Date.now(),
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: '0x123',
  status: Status.Completed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'BUY',
  provider: {
    id: 'transak',
    name: 'Transak',
    environmentType: 'PRODUCTION',
    description: '',
    hqAddress: '',
    links: [],
    logos: { light: '', dark: '', height: 24, width: 79 },
  },
  cryptoCurrency: { symbol: 'ETH' },
  fiatCurrency: { symbol: 'USD' },
  paymentMethod: { id: 'card-1', name: 'Card' },
  fiatAmountInUsd: 100,
  ...overrides,
});

describe('handleOrderStatusChangedForMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.trackEvent).mockImplementation(mockTrackEvent);
  });

  describe('BUY orders', () => {
    it('tracks RAMPS_TRANSACTION_COMPLETED with calculated exchange rate', () => {
      const order = createMockOrder({ status: Status.Completed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.name).toBe('Ramps Transaction Completed');
      expect(trackedEvent.properties).toEqual({
        amount: 100,
        amount_in_usd: 100,
        chain_id_destination: 'eip155:1',
        crypto_out: '0.5',
        currency_destination: 'ETH',
        currency_source: 'USD',
        exchange_rate: 190,
        order_type: 'BUY',
        payment_method_id: 'card-1',
        provider_onramp: 'Transak',
        total_fee: 5,
      });
    });

    it('tracks RAMPS_TRANSACTION_FAILED for Failed status', () => {
      const order = createMockOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramps Transaction Failed',
          properties: expect.objectContaining({ order_type: 'BUY' }),
        }),
      );
    });

    it('tracks RAMPS_TRANSACTION_FAILED for IdExpired status', () => {
      const order = createMockOrder({ status: Status.IdExpired });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramps Transaction Failed',
          properties: expect.objectContaining({ order_type: 'BUY' }),
        }),
      );
    });

    it('tracks ONRAMP_PURCHASE_CANCELLED', () => {
      const order = createMockOrder({ status: Status.Cancelled });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'On-ramp Purchase Cancelled',
          properties: expect.objectContaining({ order_type: 'BUY' }),
        }),
      );
    });
  });

  describe('DEPOSIT orders (Transak native on-ramp)', () => {
    // The V2 unified API returns orderType: 'DEPOSIT' for native flows
    // (e.g. Transak + Apple Pay). DEPOSIT must map to the on-ramp events,
    // not the off-ramp events. See TRAM-3534.
    it('tracks RAMPS_TRANSACTION_COMPLETED for DEPOSIT orders', () => {
      const order = createMockOrder({
        orderType: 'DEPOSIT',
        status: Status.Completed,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramps Transaction Completed',
          properties: expect.objectContaining({
            order_type: 'DEPOSIT',
            chain_id_destination: 'eip155:1',
            provider_onramp: 'Transak',
          }),
        }),
      );
    });

    it('tracks RAMPS_TRANSACTION_FAILED for DEPOSIT orders', () => {
      const order = createMockOrder({
        orderType: 'DEPOSIT',
        status: Status.Failed,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramps Transaction Failed',
          properties: expect.objectContaining({ order_type: 'DEPOSIT' }),
        }),
      );
    });

    it('tracks ONRAMP_PURCHASE_CANCELLED for DEPOSIT orders', () => {
      const order = createMockOrder({
        orderType: 'DEPOSIT',
        status: Status.Cancelled,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'On-ramp Purchase Cancelled',
          properties: expect.objectContaining({ order_type: 'DEPOSIT' }),
        }),
      );
    });
  });

  describe('SELL orders', () => {
    it('tracks OFFRAMP_PURCHASE_COMPLETED', () => {
      const order = createMockOrder({
        orderType: 'SELL',
        status: Status.Completed,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Off-ramp Purchase Completed',
          properties: expect.objectContaining({
            order_type: 'SELL',
            chain_id_source: 'eip155:1',
            provider_offramp: 'Transak',
          }),
        }),
      );
    });

    it('tracks OFFRAMP_PURCHASE_FAILED', () => {
      const order = createMockOrder({
        orderType: 'SELL',
        status: Status.Failed,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Off-ramp Purchase Failed',
          properties: expect.objectContaining({ order_type: 'SELL' }),
        }),
      );
    });

    it('tracks OFFRAMP_PURCHASE_CANCELLED', () => {
      const order = createMockOrder({
        orderType: 'SELL',
        status: Status.Cancelled,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Off-ramp Purchase Cancelled',
          properties: expect.objectContaining({ order_type: 'SELL' }),
        }),
      );
    });
  });

  it('does not track for non-terminal statuses', () => {
    const nonTerminalStatuses = [
      Status.Pending,
      Status.Created,
      Status.Precreated,
      Status.Unknown,
    ];

    for (const status of nonTerminalStatuses) {
      mockTrackEvent.mockClear();
      const order = createMockOrder({ status });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    }
  });

  it('handles exchange rate calculation when cryptoAmount is 0', () => {
    const order = createMockOrder({
      status: Status.Completed,
      cryptoAmount: '0',
    });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    const { properties } = mockTrackEvent.mock.calls[0][0];
    expect(properties.exchange_rate).toBe(0);
  });

  it('handles missing optional fields gracefully', () => {
    const order = createMockOrder({
      status: Status.Completed,
      provider: undefined,
      cryptoCurrency: undefined,
      fiatCurrency: undefined,
      paymentMethod: undefined,
    });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const { properties } = mockTrackEvent.mock.calls[0][0];
    expect(properties.currency_source).toBe('');
    expect(properties.provider_onramp).toBe('');
    expect(properties.payment_method_id).toBe('');
  });

  it('logs error when trackEvent throws', () => {
    mockTrackEvent.mockImplementationOnce(() => {
      throw new Error('tracking failed');
    });

    const order = createMockOrder({ status: Status.Completed });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    expect((Logger as jest.Mocked<typeof Logger>).error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message:
          'RampsController: Failed to track order status changed analytics',
      }),
    );
  });
});
