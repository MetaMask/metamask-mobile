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
import { handleOrderStatusChangedForHeadlessRampsFunnel } from './headlessRampsFunnel';

const mockTrackEvent = jest.fn();

jest.mock('../../../../../util/analytics/analytics', () => ({
  analytics: {
    trackEvent: jest.fn(),
  },
}));

jest.mock('../../../../Analytics', () => ({
  MetaMetricsEvents: {
    RAMPS_TRANSACTION_FAILED: { category: 'Ramps Transaction Failed' },
  },
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
}));

const createMockOrder = (overrides: Partial<RampsOrder> = {}): RampsOrder => ({
  isOnlyLink: false,
  success: false,
  cryptoAmount: '0.5',
  fiatAmount: 100,
  providerOrderId: 'order-1',
  providerOrderLink: 'https://example.com',
  createdAt: Date.now(),
  totalFeesFiat: 5,
  txHash: '0xabc',
  walletAddress: '0x123',
  status: Status.Failed,
  network: { name: 'Ethereum', chainId: 'eip155:1' },
  canBeUpdated: false,
  idHasExpired: false,
  excludeFromPurchases: false,
  timeDescriptionPending: '5-10 minutes',
  orderType: 'DEPOSIT',
  statusDescription: 'Payment was declined by the bank',
  exchangeRate: 2000,
  networkFees: 1,
  partnerFees: 2,
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
  ...overrides,
});

describe('handleOrderStatusChangedForHeadlessRampsFunnel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(analytics.trackEvent).mockImplementation(mockTrackEvent);
    __resetHeadlessOrderContextRegistryForTests();
  });

  it('emits HEADLESS RAMPS_TRANSACTION_FAILED for a headless Failed order with a context entry', () => {
    setHeadlessOrderContext('order-1', {
      rampSurface: 'money_account',
      region: 'us-ca',
    });
    const order = createMockOrder({ status: Status.Failed });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    const trackedEvent = mockTrackEvent.mock.calls[0][0];
    expect(trackedEvent.name).toBe('Ramps Transaction Failed');
    expect(trackedEvent.properties).toEqual({
      ramp_type: 'HEADLESS',
      ramp_surface: 'money_account',
      region: 'us-ca',
      country: 'us-ca',
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
  });

  it('emits for IdExpired too and deletes the entry', () => {
    setHeadlessOrderContext('order-1', { rampSurface: 'perps', region: 'fr' });
    const order = createMockOrder({ status: Status.IdExpired });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({ ramp_type: 'HEADLESS', ramp_surface: 'perps' }),
    );
    expect(getHeadlessOrderContext('order-1')).toBeUndefined();
  });

  it('falls back to a token error_message when statusDescription is absent', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    const order = createMockOrder({
      status: Status.Failed,
      statusDescription: undefined,
    });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent.mock.calls[0][0].properties.error_message).toBe(
      'transaction_failed',
    );
  });

  it('emits provider_onramp as an empty string when provider is missing', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    const order = createMockOrder({
      status: Status.Failed,
      provider: undefined,
    });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent.mock.calls[0][0].properties.provider_onramp).toBe('');
  });

  it('does NOT emit for a non-headless order (no context entry)', () => {
    const order = createMockOrder({ status: Status.Failed });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it('is idempotent: a second identical Failed event does not re-emit (emit-then-delete)', () => {
    setHeadlessOrderContext('order-1', {
      rampSurface: 'money_account',
      region: 'us-ca',
    });
    const order = createMockOrder({ status: Status.Failed });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });
    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(getHeadlessOrderContext('order-1')).toBeUndefined();
  });

  it('still deletes the entry even when trackEvent throws (no double-emit on retry) and logs', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    mockTrackEvent.mockImplementationOnce(() => {
      throw new Error('tracking failed');
    });
    const order = createMockOrder({ status: Status.Failed });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect((Logger as jest.Mocked<typeof Logger>).error).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        message:
          'RampsController: Failed to track headless RAMPS_TRANSACTION_FAILED',
      }),
    );
    expect(getHeadlessOrderContext('order-1')).toBeUndefined();

    // A retried poll of the same failed order does not re-emit.
    handleOrderStatusChangedForHeadlessRampsFunnel({ order });
    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
  });

  it('deletes the entry without emitting on Completed', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    const order = createMockOrder({ status: Status.Completed });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getHeadlessOrderContext('order-1')).toBeUndefined();
  });

  it('deletes the entry without emitting on Cancelled', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    const order = createMockOrder({ status: Status.Cancelled });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getHeadlessOrderContext('order-1')).toBeUndefined();
  });

  it('keeps the entry and does not emit on a non-terminal status', () => {
    setHeadlessOrderContext('order-1', { region: 'us-ca' });
    const order = createMockOrder({ status: Status.Pending });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).not.toHaveBeenCalled();
    expect(getHeadlessOrderContext('order-1')).toEqual({ region: 'us-ca' });
  });

  it('matches a full-path set against the bare providerOrderId the subscriber receives', () => {
    // Confirm-time write used a full path; the controller delivers the bare code.
    setHeadlessOrderContext('/providers/transak/orders/order-1', {
      rampSurface: 'prediction',
      region: 'de',
    });
    const order = createMockOrder({
      status: Status.Failed,
      providerOrderId: 'order-1',
    });

    handleOrderStatusChangedForHeadlessRampsFunnel({ order });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(mockTrackEvent.mock.calls[0][0].properties).toEqual(
      expect.objectContaining({
        ramp_type: 'HEADLESS',
        ramp_surface: 'prediction',
        region: 'de',
      }),
    );
  });

  describe('Option B limitation (post-restart, empty registry)', () => {
    it('no-ops on a headless Failed order when the registry is empty (simulating an app relaunch)', () => {
      // No setHeadlessOrderContext call: the module Map is empty as it would be
      // after the app process restarts. The same-session-only gap is by design
      // under Option B; the subscriber must NOT emit an untagged event.
      const order = createMockOrder({ status: Status.Failed });

      handleOrderStatusChangedForHeadlessRampsFunnel({ order });

      expect(mockTrackEvent).not.toHaveBeenCalled();
    });
  });
});
