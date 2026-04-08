import {
  RampsOrderStatus as Status,
  type RampsOrder,
} from '@metamask/ramps-controller';
import { handleOrderStatusChangedForMetrics } from './analytics';

const mockTrackEvent = jest.fn();

jest.mock('../../../../Analytics', () => ({
  MetaMetrics: {
    getInstance: () => ({
      trackEvent: mockTrackEvent,
    }),
  },
  MetaMetricsEvents: {
    ONRAMP_PURCHASE_COMPLETED: { category: 'On-ramp Purchase Completed' },
    ONRAMP_PURCHASE_FAILED: { category: 'On-ramp Purchase Failed' },
    ONRAMP_PURCHASE_CANCELLED: { category: 'On-ramp Purchase Cancelled' },
    OFFRAMP_PURCHASE_COMPLETED: { category: 'Off-ramp Purchase Completed' },
    OFFRAMP_PURCHASE_FAILED: { category: 'Off-ramp Purchase Failed' },
    OFFRAMP_PURCHASE_CANCELLED: { category: 'Off-ramp Purchase Cancelled' },
  },
}));

import Logger from '../../../../../util/Logger';

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
  });

  describe('BUY orders', () => {
    it('tracks ONRAMP_PURCHASE_COMPLETED with calculated exchange rate', () => {
      const order = createMockOrder({ status: Status.Completed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.name).toBe('On-ramp Purchase Completed');
      expect(trackedEvent.properties).toMatchSnapshot();
    });

    it('tracks ONRAMP_PURCHASE_FAILED for Failed status', () => {
      const order = createMockOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'On-ramp Purchase Failed',
          properties: expect.objectContaining({ order_type: 'BUY' }),
        }),
      );
    });

    it('tracks ONRAMP_PURCHASE_FAILED for IdExpired status', () => {
      const order = createMockOrder({ status: Status.IdExpired });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'On-ramp Purchase Failed',
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
