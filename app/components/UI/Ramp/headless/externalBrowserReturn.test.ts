import {
  __resetExternalBrowserReturnForTests,
  clearExternalReturnCorrelation,
  completeHeadlessExternalReturn,
  emitExternalCheckoutClosed,
  emitExternalOrderFailed,
  EXTERNAL_RETURN_TTL_MS,
  findExternalReturnCorrelationForDeeplink,
  getExternalReturnCorrelation,
  recordExternalReturnCorrelation,
  type ExternalReturnCorrelation,
} from './externalBrowserReturn';
import {
  __resetSessionRegistryForTests,
  createSession,
} from './sessionRegistry';
import type { HeadlessBuyParams } from './types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    RampsController: {
      getOrderFromCallback: jest.fn(),
      getOrder: jest.fn(),
      addOrder: jest.fn(),
      state: { orders: [] },
    },
  },
}));

jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
  () => ({
    emitTerminalOrderAnalyticsFromCallback: jest.fn(),
  }),
);

jest.mock(
  '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
  () => ({
    setHeadlessOrderContext: jest.fn(),
  }),
);

jest.mock('../../../../core/redux', () => ({
  __esModule: true,
  default: {
    store: { dispatch: jest.fn() },
  },
}));

jest.mock('../../../../actions/user', () => ({
  protectWalletModalVisible: jest.fn(() => ({
    type: 'PROTECT_MODAL_VISIBLE',
  })),
}));

jest.mock('../../../../util/analytics/analytics', () => ({
  analytics: { trackEvent: jest.fn() },
}));

jest.mock('../../../../util/analytics/AnalyticsEventBuilder', () => ({
  AnalyticsEventBuilder: {
    createEventBuilder: jest.fn((event: unknown) => {
      const built: { event: unknown; properties: Record<string, unknown> } = {
        event,
        properties: {},
      };
      const builder = {
        addProperties(props: Record<string, unknown>) {
          built.properties = { ...built.properties, ...props };
          return builder;
        },
        build: () => built,
      };
      return builder;
    }),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

const mockRampsController = jest.requireMock('../../../../core/Engine').context
  .RampsController as {
  getOrderFromCallback: jest.Mock;
  getOrder: jest.Mock;
  addOrder: jest.Mock;
  state: { orders: unknown[] };
};
const mockEmitTerminal = jest.requireMock(
  '../../../../core/Engine/controllers/ramps-controller/event-handlers/analytics',
).emitTerminalOrderAnalyticsFromCallback as jest.Mock;
const mockSetHeadlessOrderContext = jest.requireMock(
  '../../../../core/Engine/controllers/ramps-controller/headlessOrderContextRegistry',
).setHeadlessOrderContext as jest.Mock;
const mockDispatch = jest.requireMock('../../../../core/redux').default.store
  .dispatch as jest.Mock;
const mockTrackEvent = jest.requireMock('../../../../util/analytics/analytics')
  .analytics.trackEvent as jest.Mock;

const ORDER = {
  providerOrderId: '/providers/coinbase-m/orders/order-1',
  status: 'PENDING',
};

const SESSION_PARAMS = {
  quote: {
    provider: 'coinbase-m',
    quote: { paymentMethod: '/payments/debit-credit-card' },
  },
  assetId: 'eip155:42161/slip44:60',
  amount: 100,
  rampSurface: 'perps',
} as unknown as HeadlessBuyParams;

function buildCorrelation(
  sessionId: string,
  overrides: Partial<ExternalReturnCorrelation> = {},
): ExternalReturnCorrelation {
  return {
    sessionId,
    providerCode: 'coinbase-m',
    walletAddress: '0xwallet',
    rampSurface: 'perps',
    region: 'de',
    analytics: {
      checkoutSessionId: 'checkout-1',
      providerName: 'Coinbase',
      amountSource: 100,
      amountDestination: 0.05,
      paymentMethodId: '/payments/debit-credit-card',
      currencySource: 'EUR',
      currencyDestination: 'ETH',
      chainId: '42161',
    },
    onOrderCreated: jest.fn(),
    launchedAt: Date.now(),
    ...overrides,
  };
}

describe('externalBrowserReturn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetExternalBrowserReturnForTests();
    __resetSessionRegistryForTests();
    mockRampsController.getOrderFromCallback.mockResolvedValue(ORDER);
    mockRampsController.getOrder.mockResolvedValue(ORDER);
    mockRampsController.state.orders = [];
  });

  describe('correlation store', () => {
    it('returns the recorded correlation until TTL expiry', () => {
      const correlation = buildCorrelation('session-1');
      recordExternalReturnCorrelation(correlation);
      expect(getExternalReturnCorrelation('session-1')).toBe(correlation);

      recordExternalReturnCorrelation(
        buildCorrelation('session-1', {
          launchedAt: Date.now() - EXTERNAL_RETURN_TTL_MS - 1,
        }),
      );
      expect(getExternalReturnCorrelation('session-1')).toBeNull();
    });

    it('holds one record per session concurrently', () => {
      const first = buildCorrelation('session-1', { orderId: 'order-a' });
      const second = buildCorrelation('session-2', { orderId: 'order-b' });
      recordExternalReturnCorrelation(first);
      recordExternalReturnCorrelation(second);
      expect(getExternalReturnCorrelation('session-1')).toBe(first);
      expect(getExternalReturnCorrelation('session-2')).toBe(second);
    });

    it('clear with a mismatched sessionId keeps the record; undefined is a no-op', () => {
      recordExternalReturnCorrelation(buildCorrelation('session-1'));
      clearExternalReturnCorrelation('other-session');
      expect(getExternalReturnCorrelation('session-1')).not.toBeNull();
      clearExternalReturnCorrelation(undefined);
      expect(getExternalReturnCorrelation('session-1')).not.toBeNull();
      clearExternalReturnCorrelation('session-1');
      expect(getExternalReturnCorrelation('session-1')).toBeNull();
    });
  });

  describe('findExternalReturnCorrelationForDeeplink', () => {
    it('matches by normalized orderId even after the session is gone (E2)', () => {
      const record = buildCorrelation('gone-session', {
        orderId: '/providers/coinbase-m/orders/order-guid-1',
      });
      recordExternalReturnCorrelation(record);

      expect(
        findExternalReturnCorrelationForDeeplink({ orderId: 'order-guid-1' }),
      ).toBe(record);
    });

    it('returns null for a named deeplink that matches no record (foreign return)', () => {
      recordExternalReturnCorrelation(
        buildCorrelation('session-1', { orderId: 'order-guid-1' }),
      );

      expect(
        findExternalReturnCorrelationForDeeplink({
          orderId: 'someone-elses-order',
          providerCode: 'coinbase-m',
        }),
      ).toBeNull();
    });

    it('without an orderId, matches by provider only for a live session', () => {
      const onOrderCreated = jest.fn();
      const session = createSession(SESSION_PARAMS, {
        onOrderCreated,
        onClose: jest.fn(),
        onError: jest.fn(),
      });
      const liveRecord = buildCorrelation(session.id, {
        orderId: undefined,
        onOrderCreated,
      });
      recordExternalReturnCorrelation(liveRecord);
      recordExternalReturnCorrelation(
        buildCorrelation('dead-session', { orderId: undefined }),
      );

      expect(
        findExternalReturnCorrelationForDeeplink({
          providerCode: 'coinbase-m',
        }),
      ).toBe(liveRecord);
    });

    it('without an orderId, a dead session record never matches', () => {
      recordExternalReturnCorrelation(
        buildCorrelation('dead-session', { orderId: undefined }),
      );

      expect(
        findExternalReturnCorrelationForDeeplink({
          providerCode: 'coinbase-m',
        }),
      ).toBeNull();
    });
  });

  describe('completeHeadlessExternalReturn', () => {
    it('completes a live session: resolves the order, fires onOrderCreated then onClose(completed)', async () => {
      const onOrderCreated = jest.fn();
      const onClose = jest.fn();
      const onError = jest.fn();
      const session = createSession(SESSION_PARAMS, {
        onOrderCreated,
        onClose,
        onError,
      });
      recordExternalReturnCorrelation(
        buildCorrelation(session.id, { onOrderCreated }),
      );

      const order = await completeHeadlessExternalReturn({
        sessionId: session.id,
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
        rampSurface: 'perps',
        region: 'de',
      });

      expect(order).toBe(ORDER);
      expect(mockRampsController.getOrderFromCallback).toHaveBeenCalledWith(
        'coinbase-m',
        'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
        '0xwallet',
      );
      expect(mockRampsController.addOrder).toHaveBeenCalledWith(ORDER);
      expect(mockEmitTerminal).toHaveBeenCalledWith(ORDER);
      expect(mockSetHeadlessOrderContext).toHaveBeenCalledWith(
        ORDER.providerOrderId,
        { rampSurface: 'perps', region: 'de' },
      );
      expect(mockDispatch).toHaveBeenCalled();
      expect(onOrderCreated).toHaveBeenCalledWith(ORDER.providerOrderId);
      expect(onClose).toHaveBeenCalledWith({ reason: 'completed' });
      expect(onError).not.toHaveBeenCalled();
      expect(getExternalReturnCorrelation(session.id)).toBeNull();
    });

    it('E2: completes via the retained callback when the session is gone, without onClose', async () => {
      const retainedOnOrderCreated = jest.fn();
      recordExternalReturnCorrelation(
        buildCorrelation('gone-session', {
          onOrderCreated: retainedOnOrderCreated,
        }),
      );

      const order = await completeHeadlessExternalReturn({
        sessionId: 'gone-session',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
      });

      expect(order).toBe(ORDER);
      expect(retainedOnOrderCreated).toHaveBeenCalledWith(
        ORDER.providerOrderId,
      );
      expect(getExternalReturnCorrelation('gone-session')).toBeNull();
    });

    it('returns null when neither a session nor a correlation exists', async () => {
      const order = await completeHeadlessExternalReturn({
        sessionId: 'unknown',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m',
      });
      expect(order).toBeNull();
      expect(mockRampsController.getOrderFromCallback).not.toHaveBeenCalled();
    });

    it('falls back to getOrder with the orderId when callback resolution yields nothing', async () => {
      mockRampsController.getOrderFromCallback.mockResolvedValue(null);
      recordExternalReturnCorrelation(buildCorrelation('session-2'));

      const order = await completeHeadlessExternalReturn({
        sessionId: 'session-2',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-9',
      });

      expect(mockRampsController.getOrder).toHaveBeenCalledWith(
        'coinbase-m',
        'order-9',
        '0xwallet',
      );
      expect(order).toBe(ORDER);
    });

    it('resolves the wallet from the persisted Precreated stub when the caller omits it', async () => {
      mockRampsController.state.orders = [
        { providerOrderId: 'order-1', walletAddress: '0xstub-wallet' },
      ];
      recordExternalReturnCorrelation(
        buildCorrelation('session-stub', {
          orderId: 'order-1',
          walletAddress: undefined,
        }),
      );

      const order = await completeHeadlessExternalReturn({
        sessionId: 'session-stub',
        providerCode: 'coinbase-m',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
      });

      expect(order).toBe(ORDER);
      expect(mockRampsController.getOrderFromCallback).toHaveBeenCalledWith(
        'coinbase-m',
        'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
        '0xstub-wallet',
      );
    });

    it('throws when no wallet is available from the caller, the stub, or the record', async () => {
      recordExternalReturnCorrelation(
        buildCorrelation('session-nowallet', {
          orderId: undefined,
          walletAddress: undefined,
        }),
      );

      await expect(
        completeHeadlessExternalReturn({
          sessionId: 'session-nowallet',
          providerCode: 'coinbase-m',
          returnUrl: 'metamask://on-ramp/providers/coinbase-m',
        }),
      ).rejects.toThrow('No wallet address available');
      expect(mockRampsController.getOrderFromCallback).not.toHaveBeenCalled();
    });

    it('normalizes a full-path fallback orderId to the bare order code for getOrder', async () => {
      mockRampsController.getOrderFromCallback.mockResolvedValue(null);
      recordExternalReturnCorrelation(buildCorrelation('session-2b'));

      await completeHeadlessExternalReturn({
        sessionId: 'session-2b',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m',
        orderIdFallback: '/providers/coinbase-m/orders/order-guid-7',
      });

      expect(mockRampsController.getOrder).toHaveBeenCalledWith(
        'coinbase-m',
        'order-guid-7',
        '0xwallet',
      );
    });

    it('throws when the order cannot be resolved and keeps the correlation for the caller to route', async () => {
      mockRampsController.getOrderFromCallback.mockRejectedValue(
        new Error('lookup failed'),
      );
      mockRampsController.getOrder.mockRejectedValue(new Error('also failed'));
      recordExternalReturnCorrelation(buildCorrelation('session-3'));

      await expect(
        completeHeadlessExternalReturn({
          sessionId: 'session-3',
          providerCode: 'coinbase-m',
          walletAddress: '0xwallet',
          returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-9',
        }),
      ).rejects.toThrow('lookup failed');
      expect(getExternalReturnCorrelation('session-3')).not.toBeNull();
    });

    it('guards against concurrent double-completion for the same session', async () => {
      let resolveLookup: (value: unknown) => void = () => undefined;
      mockRampsController.getOrderFromCallback.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveLookup = resolve;
          }),
      );
      const onOrderCreated = jest.fn();
      recordExternalReturnCorrelation(
        buildCorrelation('session-4', { onOrderCreated }),
      );

      const args = {
        sessionId: 'session-4',
        providerCode: 'coinbase-m',
        walletAddress: '0xwallet',
        returnUrl: 'metamask://on-ramp/providers/coinbase-m?orderId=order-1',
      };
      const first = completeHeadlessExternalReturn(args);
      const second = completeHeadlessExternalReturn(args);
      await expect(second).resolves.toBeNull();
      resolveLookup(ORDER);
      await expect(first).resolves.toBe(ORDER);
      expect(onOrderCreated).toHaveBeenCalledTimes(1);
    });
  });

  describe('analytics emitters (P2.M7)', () => {
    it('emitExternalCheckoutClosed emits RAMPS_CHECKOUT_CLOSED with headless base props', () => {
      emitExternalCheckoutClosed(buildCorrelation('session-5'), false);
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const built = mockTrackEvent.mock.calls[0][0];
      expect(built.properties).toMatchObject({
        ramp_type: 'HEADLESS',
        ramp_surface: 'perps',
        region: 'de',
        provider_name: 'Coinbase',
        checkout_session_id: 'checkout-1',
        close_source: 'user_close_button',
        callback_reached: false,
      });
    });

    it('emitExternalOrderFailed emits RAMPS_ORDER_FAILED with the Checkout property shape', () => {
      emitExternalOrderFailed(
        buildCorrelation('session-6'),
        new Error('resolution failed'),
      );
      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const built = mockTrackEvent.mock.calls[0][0];
      expect(built.properties).toMatchObject({
        ramp_type: 'HEADLESS',
        ramp_surface: 'perps',
        amount_source: 100,
        amount_destination: 0.05,
        payment_method_id: '/payments/debit-credit-card',
        region: 'de',
        chain_id: '42161',
        currency_destination: 'ETH',
        currency_source: 'EUR',
        error_message: 'resolution failed',
        is_authenticated: true,
      });
    });
  });
});
