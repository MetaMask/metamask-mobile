import {
  RampsOrderStatus as Status,
  type RampsOrder,
} from '@metamask/ramps-controller';
import { analytics } from '../../../../../util/analytics/analytics';
import Logger from '../../../../../util/Logger';
import {
  __resetHeadlessOrderContextRegistryForTests,
  getHeadlessOrderContext,
  setHeadlessOrderContext,
} from '../headlessOrderContextRegistry';
import {
  __resetTerminalOrderAnalyticsRegistryForTests,
  markTerminalOrderAnalyticsEmitted,
} from '../terminalOrderAnalyticsRegistry';
import {
  emitOrderConfirmedAnalyticsFromCallback,
  emitTerminalOrderAnalyticsFromCallback,
  handleOrderStatusChangedForMetrics,
} from './analytics';
import ReduxService from '../../../../redux';
import configureStore from '../../../../../util/test/configureStore';

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
    RAMPS_TRANSACTION_CONFIRMED: { category: 'Ramps Transaction Confirmed' },
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
  cryptoCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  fiatCurrency: { symbol: 'USD' },
  paymentMethod: { id: 'card-1', name: 'Card' },
  fiatAmountInUsd: 100,
  region: 'US',
  exchangeRate: 200,
  networkFees: 1,
  partnerFees: 2,
  statusDescription: 'card_declined',
  ...overrides,
});

describe('handleOrderStatusChangedForMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.trackEvent).mockImplementation(mockTrackEvent);
    // The headless context registry is now backed by the `headlessOrderContexts`
    // redux slice (TRAM-3691 Part B); a fresh store per test isolates contexts.
    ReduxService.store = configureStore({});
    // MANDATORY: clear the module-level registry so a headless context seeded
    // by one test cannot leak into the BUY/SELL/missing-fields tests and flip
    // their expected events (they assume no entry).
    __resetHeadlessOrderContextRegistryForTests();
    // TRAM-3691: clear the terminal-emit dedup registry so a terminal emit in
    // one test cannot suppress the callback emitter in another.
    __resetTerminalOrderAnalyticsRegistryForTests();
  });

  describe('BUY orders', () => {
    it('tracks RAMPS_TRANSACTION_COMPLETED with the unified deposit-shaped payload', () => {
      const order = createMockOrder({ status: Status.Completed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.name).toBe('Ramps Transaction Completed');
      expect(trackedEvent.properties).toEqual({
        ramp_type: 'UNIFIED_BUY_2',
        provider_order_id: 'order-1',
        amount_source: 100,
        amount_destination: 0.5,
        exchange_rate: 200,
        payment_method_id: 'card-1',
        country: 'US',
        chain_id: 'eip155:1',
        currency_destination: 'eip155:1/slip44:60',
        currency_destination_symbol: 'ETH',
        currency_destination_network: 'Ethereum',
        currency_source: 'USD',
        provider_onramp: 'Transak',
        gas_fee: 1,
        processing_fee: 2,
        total_fee: 5,
      });
    });

    it('tracks RAMPS_TRANSACTION_FAILED for Failed status with the unified payload + error_message', () => {
      const order = createMockOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Ramps Transaction Failed',
          properties: expect.objectContaining({
            ramp_type: 'UNIFIED_BUY_2',
            provider_order_id: 'order-1',
            chain_id: 'eip155:1',
            provider_onramp: 'Transak',
            error_message: 'card_declined',
          }),
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
          properties: expect.objectContaining({
            ramp_type: 'UNIFIED_BUY_2',
            error_message: 'card_declined',
          }),
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
            ramp_type: 'UNIFIED_BUY_2',
            provider_order_id: 'order-1',
            chain_id: 'eip155:1',
            country: 'US',
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
          properties: expect.objectContaining({
            ramp_type: 'UNIFIED_BUY_2',
            error_message: 'card_declined',
          }),
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

  describe('headless orders (TRAM-3623 AC5)', () => {
    // A headless order carries a context entry (written at confirm time by
    // useTransakRouting). When such an order reaches a terminal failure, this
    // metrics handler - the SINGLE orderStatusChanged metrics subscriber - emits
    // the tagged RAMPS_TRANSACTION_FAILED and suppresses the generic emit, so it
    // cannot double-emit with the generic buy/deposit failure event.
    const createHeadlessOrder = (
      overrides: Partial<RampsOrder> = {},
    ): RampsOrder =>
      createMockOrder({
        success: false,
        orderType: 'DEPOSIT',
        status: Status.Failed,
        statusDescription: 'Payment was declined by the bank',
        exchangeRate: 2000,
        networkFees: 1,
        partnerFees: 2,
        cryptoCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
        ...overrides,
      });

    it('emits EXACTLY ONE event, RAMPS_TRANSACTION_FAILED (tagged HEADLESS) and NOT OFFRAMP_PURCHASE_FAILED, for a headless Failed order', () => {
      setHeadlessOrderContext('order-1', {
        rampSurface: 'money_account',
        region: 'us-ca',
      });
      const order = createHeadlessOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      // The core de-dup guarantee: a single emit, the tagged failure event, and
      // never the mis-classified off-ramp event the generic path would produce.
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.name).toBe('Ramps Transaction Failed');
      expect(trackedEvent.properties).toEqual({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: 'us-ca',
        country: 'us-ca',
        provider_order_id: 'order-1',
        error_message: 'Payment was declined by the bank',
        provider_onramp: 'Transak',
        amount_source: 100,
        amount_destination: 0.5,
        exchange_rate: 2000,
        gas_fee: 1,
        processing_fee: 2,
        total_fee: 5,
        payment_method_id: 'card-1',
        chain_id: 'eip155:1',
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
      });
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();
    });

    it('emits for IdExpired too and deletes the entry', () => {
      setHeadlessOrderContext('order-1', {
        rampSurface: 'perps',
        region: 'fr',
      });
      const order = createHeadlessOrder({ status: Status.IdExpired });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'perps',
        }),
      );
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();
    });

    it('falls back to a token error_message when statusDescription is absent', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      const order = createHeadlessOrder({
        status: Status.Failed,
        statusDescription: undefined,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent.mock.calls[0][0].properties.error_message).toBe(
        'transaction_failed',
      );
    });

    it('emits provider_onramp as an empty string when provider is missing', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      const order = createHeadlessOrder({
        status: Status.Failed,
        provider: undefined,
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent.mock.calls[0][0].properties.provider_onramp).toBe(
        '',
      );
    });

    it('does NOT emit a HEADLESS-tagged RAMPS_TRANSACTION_FAILED for an order with no context entry: a non-headless BUY emits the generic UNIFIED_BUY_2-tagged event (TRAM-3534)', () => {
      const order = createMockOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      // No registry entry: the headless fold is inert and the generic emit
      // runs. Per TRAM-3534, V2 buys/deposits emit RAMPS_TRANSACTION_FAILED
      // with ramp_type: 'UNIFIED_BUY_2' (not 'HEADLESS'). The de-dup is
      // expressed by the ramp_type discriminator, not by event name.
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.name).toBe('Ramps Transaction Failed');
      expect(trackedEvent.properties.ramp_type).toBe('UNIFIED_BUY_2');
      expect(trackedEvent.properties.ramp_type).not.toBe('HEADLESS');
    });

    it('emits HEADLESS on a Failed order whose context came from persisted state (app relaunch, TRAM-3691 Part B)', () => {
      // Part B: the context lives in the persisted `headlessOrderContexts`
      // slice, so it survives an app relaunch. Seed the store as redux-persist
      // would rehydrate it - NOT via an in-session setHeadlessOrderContext call -
      // then fail the order. The handler must read the rehydrated context and
      // emit HEADLESS, no longer the mis-tagged UNIFIED_BUY_2 that the empty
      // in-memory registry produced post-relaunch.
      ReduxService.store = configureStore({
        headlessOrderContexts: {
          'order-1': {
            rampSurface: 'prediction',
            region: 'de',
            createdAt: Date.now(),
          },
        },
      });
      const order = createHeadlessOrder({
        status: Status.Failed,
        providerOrderId: 'order-1',
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'prediction',
          region: 'de',
        }),
      );
    });

    it('is idempotent: a second identical Failed event finds no entry and does not re-emit the tagged event', () => {
      setHeadlessOrderContext('order-1', {
        rampSurface: 'money_account',
        region: 'us-ca',
      });
      const order = createHeadlessOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });
      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      // The HEADLESS-tagged failure event fires exactly once. Per TRAM-3691 the
      // terminal-emit dedup registry now also suppresses the second call
      // entirely (it would otherwise fall through to the generic UNIFIED_BUY_2
      // emit once the headless context is deleted), so a terminal order emits
      // exactly one terminal analytics event per session.
      const headlessTaggedEmits = mockTrackEvent.mock.calls.filter(
        (call) =>
          call[0].name === 'Ramps Transaction Failed' &&
          call[0].properties.ramp_type === 'HEADLESS',
      );
      expect(headlessTaggedEmits).toHaveLength(1);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();
    });

    it('still deletes the entry even when trackEvent throws (no double-emit on retry) and logs', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      mockTrackEvent.mockImplementationOnce(() => {
        throw new Error('tracking failed');
      });
      const order = createHeadlessOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect((Logger as jest.Mocked<typeof Logger>).error).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message:
            'RampsController: Failed to track headless RAMPS_TRANSACTION_FAILED',
        }),
      );
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();

      // A retried poll of the same failed order finds no entry, so it
      // never re-emits the HEADLESS-tagged event (even though the first
      // emit threw). The retry will fall through to the generic
      // UNIFIED_BUY_2 emit per TRAM-3534, which is fine — only the
      // HEADLESS-tagged event is the one we de-dup on.
      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });
      const headlessTaggedEmits = mockTrackEvent.mock.calls.filter(
        (call) =>
          call[0].name === 'Ramps Transaction Failed' &&
          call[0].properties.ramp_type === 'HEADLESS',
      );
      expect(headlessTaggedEmits).toHaveLength(1);
    });

    it('deletes the entry on Completed and (Option B) still fires the generic completion event', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      const order = createHeadlessOrder({ status: Status.Completed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      // Option B: the generic completion emit still fires (no tagged COMPLETED).
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).not.toBe(
        'Ramps Transaction Failed',
      );
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();
    });

    it('deletes the entry on Cancelled and (Option B) falls through to the generic emit', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      const order = createHeadlessOrder({ status: Status.Cancelled });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).not.toBe(
        'Ramps Transaction Failed',
      );
      expect(getHeadlessOrderContext('order-1')).toBeUndefined();
    });

    it('keeps the entry and does not emit on a non-terminal status', () => {
      setHeadlessOrderContext('order-1', { region: 'us-ca' });
      const order = createHeadlessOrder({ status: Status.Pending });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Created,
      });

      expect(mockTrackEvent).not.toHaveBeenCalled();
      expect(getHeadlessOrderContext('order-1')).toEqual({ region: 'us-ca' });
    });

    it('matches a full-path set against the bare providerOrderId the subscriber receives', () => {
      // Confirm-time write used a full path; the controller delivers the bare code.
      setHeadlessOrderContext('/providers/transak/orders/order-1', {
        rampSurface: 'prediction',
        region: 'de',
      });
      const order = createHeadlessOrder({
        status: Status.Failed,
        providerOrderId: 'order-1',
      });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({
          ramp_type: 'HEADLESS',
          ramp_surface: 'prediction',
          region: 'de',
        }),
      );
    });

    it('no-ops the HEADLESS path on a headless Failed order when the registry is empty (simulating an app relaunch)', () => {
      // No setHeadlessOrderContext call: the module Map is empty as it would
      // be after the app process restarts. Under Option B the
      // same-session-only gap is by design; the handler must NOT emit a
      // HEADLESS-tagged event. The generic emit still runs for the DEPOSIT
      // order and emits RAMPS_TRANSACTION_FAILED with ramp_type:
      // 'UNIFIED_BUY_2' per TRAM-3534 (not 'HEADLESS') — that's the correct
      // post-relaunch behavior, and the de-dup is on ramp_type.
      const order = createHeadlessOrder({ status: Status.Failed });

      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const trackedEvent = mockTrackEvent.mock.calls[0][0];
      expect(trackedEvent.properties.ramp_type).not.toBe('HEADLESS');
      expect(trackedEvent.properties.ramp_type).toBe('UNIFIED_BUY_2');
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

  it('handles exchange rate calculation when cryptoAmount is 0 and order has no exchangeRate', () => {
    const order = createMockOrder({
      status: Status.Completed,
      cryptoAmount: '0',
      exchangeRate: undefined,
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

  it('falls back to defaults when region, network, fees, and statusDescription are missing on a failed BUY', () => {
    const order = createMockOrder({
      status: Status.Failed,
      region: undefined,
      network: undefined,
      networkFees: undefined,
      partnerFees: undefined,
      statusDescription: undefined,
    });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const { properties } = mockTrackEvent.mock.calls[0][0];
    expect(properties.country).toBe('');
    expect(properties.chain_id).toBe('');
    expect(properties.currency_destination_network).toBeUndefined();
    expect(properties.gas_fee).toBe(0);
    expect(properties.processing_fee).toBe(0);
    expect(properties.error_message).toBe('transaction_failed');
  });

  it('falls back to defaults for legacy SELL params when network and provider are missing', () => {
    const order = createMockOrder({
      orderType: 'SELL',
      status: Status.Failed,
      network: undefined,
      provider: undefined,
    });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Off-ramp Purchase Failed',
        properties: expect.objectContaining({
          chain_id_source: '',
          provider_offramp: '',
        }),
      }),
    );
  });

  it('falls back to empty strings for SELL legacy currency_source/destination when cryptoCurrency and fiatCurrency are missing', () => {
    const order = createMockOrder({
      orderType: 'SELL',
      status: Status.Completed,
      cryptoCurrency: undefined,
      fiatCurrency: undefined,
    });

    handleOrderStatusChangedForMetrics({
      order,
      previousStatus: Status.Pending,
    });

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Off-ramp Purchase Completed',
        properties: expect.objectContaining({
          currency_source: '',
          currency_destination: '',
        }),
      }),
    );
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

  // TRAM-3691: terminal callback orders (added via addOrder, never polled)
  // bypass orderStatusChanged. The callback sites emit the terminal event
  // directly via this function.
  describe('emitTerminalOrderAnalyticsFromCallback (TRAM-3691)', () => {
    it('emits RAMPS_TRANSACTION_COMPLETED for an already-terminal UB2 buy', () => {
      const order = createMockOrder({ status: Status.Completed });

      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        'Ramps Transaction Completed',
      );
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({
          ramp_type: 'UNIFIED_BUY_2',
          provider_order_id: 'order-1',
        }),
      );
    });

    it('emits RAMPS_TRANSACTION_FAILED for an already-terminal Failed buy', () => {
      const order = createMockOrder({ status: Status.Failed });

      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        'Ramps Transaction Failed',
      );
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({
          ramp_type: 'UNIFIED_BUY_2',
          provider_order_id: 'order-1',
        }),
      );
    });

    it('does NOT emit for a non-terminal order (polled normally instead)', () => {
      const order = createMockOrder({ status: Status.Pending });

      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('does NOT double-emit when the polling path already emitted the terminal event', () => {
      const order = createMockOrder({ status: Status.Completed });

      // Simulate the polling subscription emitting first...
      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      // ...then a callback re-fetch of the same terminal order must be a no-op.
      emitTerminalOrderAnalyticsFromCallback(order);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('emits only once across repeat callback observations of the same order', () => {
      const order = createMockOrder({ status: Status.Completed });

      emitTerminalOrderAnalyticsFromCallback(order);
      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('dedups against the polling path even when providerOrderId differs but id matches', () => {
      // Polling delivers a HEALED order (providerOrderId = internal code from
      // id); the callback delivers the RAW order (providerOrderId = provider
      // native id). Both share the same `id`, so `getInternalOrderCode` keys
      // them identically and the terminal event is not double-emitted.
      const polledOrder = createMockOrder({
        id: '/providers/transak/orders/mm-internal-code',
        providerOrderId: 'mm-internal-code',
        status: Status.Completed,
      });
      const callbackOrder = createMockOrder({
        id: '/providers/transak/orders/mm-internal-code',
        providerOrderId: 'transak-native-999',
        status: Status.Completed,
      });

      handleOrderStatusChangedForMetrics({
        order: polledOrder,
        previousStatus: Status.Pending,
      });
      emitTerminalOrderAnalyticsFromCallback(callbackOrder);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('does NOT double-emit when a racing poll publishes AFTER the callback emit', () => {
      const order = createMockOrder({ status: Status.Completed });

      // Callback emits first (already-terminal on first observation)...
      emitTerminalOrderAnalyticsFromCallback(order);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);

      // ...then an in-flight poll resolves and publishes the Pending->Completed
      // transition. The handler must short-circuit on the dedup registry.
      handleOrderStatusChangedForMetrics({
        order,
        previousStatus: Status.Pending,
      });
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    });

    it('is a no-op when the order code was already recorded as emitted', () => {
      const order = createMockOrder({ status: Status.Completed });
      markTerminalOrderAnalyticsEmitted(order);

      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });

    it('tags a headless terminal failure as HEADLESS when a context entry exists', () => {
      const order = createMockOrder({
        status: Status.Failed,
        providerOrderId: 'headless-callback-1',
      });
      setHeadlessOrderContext(order.providerOrderId, {
        rampSurface: 'money_account',
        region: 'US',
      });

      emitTerminalOrderAnalyticsFromCallback(order);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent.mock.calls[0][0].name).toBe(
        'Ramps Transaction Failed',
      );
      expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
        expect.objectContaining({ ramp_type: 'HEADLESS' }),
      );
    });
  });
});

describe('emitOrderConfirmedAnalyticsFromCallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.trackEvent).mockImplementation(mockTrackEvent);
    __resetTerminalOrderAnalyticsRegistryForTests();
  });

  it('emits RAMPS_TRANSACTION_CONFIRMED with UNIFIED_BUY_2 for a non-terminal order', () => {
    const order = createMockOrder({ status: Status.Pending });

    emitOrderConfirmedAnalyticsFromCallback(order, {
      rampType: 'UNIFIED_BUY_2',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].name).toBe(
      'Ramps Transaction Confirmed',
    );
    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({
        ramp_type: 'UNIFIED_BUY_2',
        amount_source: 100,
        amount_destination: 0.5,
        country: 'US',
        chain_id: 'eip155:1',
      }),
    );
  });

  it('emits RAMPS_TRANSACTION_CONFIRMED with HEADLESS surface and region', () => {
    const order = createMockOrder({ status: Status.Created });

    emitOrderConfirmedAnalyticsFromCallback(order, {
      rampType: 'HEADLESS',
      rampSurface: 'money_account',
      region: 'US-CA',
    });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({
        ramp_type: 'HEADLESS',
        ramp_surface: 'money_account',
        region: 'US-CA',
        country: 'US-CA',
      }),
    );
  });

  it('is a no-op for terminal orders', () => {
    const order = createMockOrder({ status: Status.Completed });

    emitOrderConfirmedAnalyticsFromCallback(order, {
      rampType: 'UNIFIED_BUY_2',
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
