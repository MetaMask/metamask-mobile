import React from 'react';
import { act, screen, waitFor } from '@testing-library/react-native';

import HeadlessHost, {
  HEADLESS_HOST_CONTAINER_TEST_ID,
  createHeadlessHostNavDetails,
  type HeadlessHostParams,
} from './HeadlessHost';
import {
  __resetSessionRegistryForTests,
  closeSession,
  createSession,
  getSession,
} from '../../headless/sessionRegistry';
import type { Quote } from '../../types';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';

// =============================================================================
// Mocks
// =============================================================================
// HeadlessHost is heavily orchestrated; mock every hook it consumes so the
// suite focuses on the orchestration logic itself (which paths fire, with
// what context, and how status / error guards interact). Integration with
// the real `useContinueWithQuote`, `useRampsPaymentMethods`, etc. is covered
// in their own test suites.

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockAddListener = jest.fn();
const mockContinueWithQuote = jest.fn();
const mockUseContinueWithQuoteOptions = jest.fn();

// Holds the most recent 'beforeRemove' listener registered against the
// mocked navigation object. Tests fire it directly to exercise the
// production beforeRemove path without spinning up a real navigator.
let registeredBeforeRemoveListener: (() => void) | null = null;

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
      addListener: mockAddListener,
    }),
  };
});

jest.mock('../../hooks/useContinueWithQuote', () => ({
  __esModule: true,
  default: (options?: unknown) => {
    mockUseContinueWithQuoteOptions(options);
    return { continueWithQuote: mockContinueWithQuote };
  },
}));

const mockUseRampAccountAddress = jest.fn();
jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: (chainId: unknown) => mockUseRampAccountAddress(chainId),
}));

const mockUseRampsUserRegion = jest.fn();
jest.mock('../../hooks/useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUseRampsUserRegion(),
}));

const mockUseRampsPaymentMethods = jest.fn();
jest.mock('../../hooks/useRampsPaymentMethods', () => ({
  useRampsPaymentMethods: () => mockUseRampsPaymentMethods(),
}));

// Logger is fire-and-forget; silence it here so failed-path assertions stay
// readable.
jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn(), log: jest.fn() },
}));

// =============================================================================
// Fixtures
// =============================================================================

const SAMPLE_ASSET_ID = 'eip155:59144/erc20:0xabc';
const SAMPLE_AMOUNT = 25;

function buildAggregatorQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    provider: '/providers/moonpay',
    quote: {
      amountIn: SAMPLE_AMOUNT,
      amountOut: 0.01,
      paymentMethod: '/payments/debit-credit-card',
      cryptoTranslation: { symbol: 'mUSD' },
    },
    providerInfo: {
      id: '/providers/moonpay',
      name: 'MoonPay',
      type: 'aggregator',
    },
    ...overrides,
  } as unknown as Quote;
}

function buildNativeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    provider: '/providers/transak-native',
    quote: {
      amountIn: SAMPLE_AMOUNT,
      amountOut: 0.011,
      paymentMethod: '/payments/debit-credit-card',
      cryptoTranslation: { symbol: 'mUSD' },
    },
    providerInfo: {
      id: '/providers/transak-native',
      name: 'Transak',
      type: 'native',
    },
    ...overrides,
  } as unknown as Quote;
}

function buildCallbacks() {
  return {
    onOrderCreated: jest.fn(),
    onError: jest.fn(),
    onClose: jest.fn(),
  };
}

function seedSession(
  quote: Quote,
  paramsOverrides: Record<string, unknown> = {},
) {
  return createSession(
    {
      quote,
      assetId: SAMPLE_ASSET_ID,
      amount: SAMPLE_AMOUNT,
      ...paramsOverrides,
    } as never,
    buildCallbacks(),
  );
}

function renderHost(initialParams: Partial<HeadlessHostParams> = {}) {
  return renderScreen(
    HeadlessHost,
    { name: Routes.RAMP.HEADLESS_HOST },
    { state: {} },
    initialParams as Record<string, unknown>,
  );
}

// =============================================================================
// Suite
// =============================================================================

describe('HeadlessHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __resetSessionRegistryForTests();
    registeredBeforeRemoveListener = null;
    mockAddListener.mockImplementation(
      (eventName: string, listener: () => void) => {
        if (eventName === 'beforeRemove') {
          registeredBeforeRemoveListener = listener;
        }
        return jest.fn();
      },
    );
    mockUseRampAccountAddress.mockReturnValue('0xWALLET');
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: { country: { currency: 'EUR' } },
    });
    mockUseRampsPaymentMethods.mockReturnValue({
      paymentMethods: [
        { id: '/payments/debit-credit-card', name: 'Debit / Credit Card' },
        { id: '/payments/bank-transfer', name: 'Bank transfer' },
      ],
    });
    mockContinueWithQuote.mockResolvedValue(undefined);
  });

  describe('Static surface', () => {
    it('exposes a navigation helper that targets HEADLESS_HOST', () => {
      const [name, params] = createHeadlessHostNavDetails({
        headlessSessionId: 'headless-buy-abc',
      });
      expect(name).toBe(Routes.RAMP.HEADLESS_HOST);
      expect(params).toEqual({ headlessSessionId: 'headless-buy-abc' });
    });

    it('renders only a transparent container — no header, spinner, or buttons after Phase 9.5', () => {
      // The Phase 9.5 contract: the consumer (TPC / MMPay) renders all
      // user-visible loading UI. The Host is a stack base only.
      const session = seedSession(buildAggregatorQuote());
      renderHost({ headlessSessionId: session.id });
      expect(
        screen.getByTestId(HEADLESS_HOST_CONTAINER_TEST_ID),
      ).toBeOnTheScreen();
      // No legacy chrome should be present.
      expect(screen.queryByText(/Cancel/i)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Preparing/i)).not.toBeOnTheScreen();
      expect(screen.queryByText(/no longer active/i)).not.toBeOnTheScreen();
    });

    it('renders the transparent container even with no session — no UI affordances surface to the user', () => {
      // Pre-Phase 9.5 this rendered a "no session" message; the consumer
      // now owns that surface.
      renderHost({ headlessSessionId: 'headless-buy-not-real' });
      expect(
        screen.getByTestId(HEADLESS_HOST_CONTAINER_TEST_ID),
      ).toBeOnTheScreen();
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });
  });

  describe('useTransakRouting wiring', () => {
    it('pins the inner useContinueWithQuote to HEADLESS_HOST as the routing base', () => {
      const session = seedSession(buildNativeQuote());
      renderHost({ headlessSessionId: session.id });
      expect(mockUseContinueWithQuoteOptions).toHaveBeenCalledWith({
        transakRouting: {
          baseRoute: Routes.RAMP.HEADLESS_HOST,
          baseRouteParams: { headlessSessionId: session.id },
        },
      });
    });
  });

  describe('Continue-on-focus orchestration', () => {
    it('calls continueWithQuote once with a context derived from the session quote (aggregator)', async () => {
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );
      const [calledQuote, ctx] = mockContinueWithQuote.mock.calls[0];
      expect(calledQuote).toBe(quote);
      expect(ctx).toEqual({
        amount: SAMPLE_AMOUNT,
        assetId: SAMPLE_ASSET_ID,
        chainId: 'eip155:59144',
        walletAddress: '0xWALLET',
        currency: 'EUR',
        cryptoSymbol: 'mUSD',
        paymentMethodId: '/payments/debit-credit-card',
        providerName: 'MoonPay',
        headlessSessionId: session.id,
      });
    });

    it('calls continueWithQuote once for a native quote and flips the session status to `continued`', async () => {
      const quote = buildNativeQuote();
      const session = seedSession(quote);
      renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );
      // Status flip is what guards the auth-loop re-focus path: when
      // OtpCode resets back to [HEADLESS_HOST, KycWebview], focus on the
      // host briefly fires but session.status === 'continued' makes the
      // effect a no-op. Asserting the flip lets us trust that contract
      // without forcing a real re-focus inside this unit suite.
      expect(getSession(session.id)?.status).toBe('continued');
    });

    it('honors an explicit paymentMethodId override from the session params instead of resolving from the quote', async () => {
      const quote = buildNativeQuote();
      const session = seedSession(quote, {
        paymentMethodId: '/payments/bank-transfer',
        currency: 'USD',
      });
      renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );
      const [, ctx] = mockContinueWithQuote.mock.calls[0];
      expect(ctx.paymentMethodId).toBe('/payments/bank-transfer');
      expect(ctx.currency).toBe('USD');
    });

    it('falls back to userRegion currency when the session does not pin one', async () => {
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );
      const [, ctx] = mockContinueWithQuote.mock.calls[0];
      expect(ctx.currency).toBe('EUR');
    });

    it('skips orchestration when the session has already been cancelled', async () => {
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      // Mark the session terminal *before* the screen mounts: the focus
      // effect must respect that and avoid a stale re-trigger.
      closeSession(session.id, { reason: 'consumer_cancelled' });
      renderHost({ headlessSessionId: session.id });
      // No session left → orchestration short-circuits. The consumer
      // already received onClose from the closeSession call above.
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('forwards a malformed assetId as onError(UNKNOWN, ...) and closes the session', () => {
      // Real hook: falsy chain id → null wallet. The invalid-assetId branch
      // must run before the wallet deferral or the effect would return early
      // forever (regression guard for guard ordering).
      mockUseRampAccountAddress.mockReturnValue(null);
      const quote = buildAggregatorQuote();
      const session = seedSession(quote, { assetId: 'not-a-caip-19' });
      const callbacks = session.callbacks;
      renderHost({ headlessSessionId: session.id });
      expect(callbacks.onError).toHaveBeenCalledWith({
        code: 'UNKNOWN',
        message: expect.stringContaining('not-a-caip-19'),
      });
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
      expect(getSession(session.id)).toBeUndefined();
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });

    it('surfaces a continueWithQuote rejection as onError(UNKNOWN, ...)', async () => {
      mockContinueWithQuote.mockRejectedValueOnce(new Error('quote expired'));
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      renderHost({ headlessSessionId: session.id });
      await waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith({
          code: 'UNKNOWN',
          message: 'quote expired',
        });
      });
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
      expect(getSession(session.id)).toBeUndefined();
    });

    it('surfaces limit failures as onError(LIMIT_EXCEEDED, ...)', async () => {
      const limitError = new Error('Daily limit exceeded');
      limitError.name = 'LimitExceededError';
      mockContinueWithQuote.mockRejectedValueOnce(limitError);
      const quote = buildNativeQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      renderHost({ headlessSessionId: session.id });
      await waitFor(() => {
        expect(callbacks.onError).toHaveBeenCalledWith({
          code: 'LIMIT_EXCEEDED',
          message: 'Daily limit exceeded',
        });
      });
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
      expect(getSession(session.id)).toBeUndefined();
    });

    it('does not surface a continueWithQuote rejection that arrives after unmount', async () => {
      let rejectDeferred: ((error: Error) => void) | undefined;
      mockContinueWithQuote.mockImplementation(
        () =>
          new Promise((_resolve, reject) => {
            rejectDeferred = reject;
          }),
      );
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      const { unmount } = renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );
      unmount();
      // Phase 8: unmount fires the dismissal close because the session
      // had not reached a terminal status. After unmount the session is
      // gone from the registry, so the .catch's live-session re-read
      // short-circuits and does not produce a second onClose or an
      // onError. (The .catch's `cancelled` flag is independent React
      // unmount-state protection; this test does not exercise it
      // directly.)
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'user_dismissed',
      });
      expect(getSession(session.id)).toBeUndefined();
      await act(async () => {
        rejectDeferred?.(new Error('late failure'));
      });
      expect(callbacks.onError).not.toHaveBeenCalled();
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    it('forwards a nativeFlowError param as onError(AUTH_FAILED, ...) and closes the session', () => {
      const quote = buildNativeQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      renderHost({
        headlessSessionId: session.id,
        nativeFlowError: 'OTP rejected',
      });
      expect(callbacks.onError).toHaveBeenCalledWith({
        code: 'AUTH_FAILED',
        message: 'OTP rejected',
      });
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });
      expect(getSession(session.id)).toBeUndefined();
      // The auth-error path also short-circuits the continue-on-focus effect
      // — we never want to push EnterEmail again on top of the error message.
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });

    it('does not crash when the consumer onError callback throws', async () => {
      mockContinueWithQuote.mockRejectedValueOnce(new Error('boom'));
      const quote = buildAggregatorQuote();
      const session = createSession(
        {
          quote,
          assetId: SAMPLE_ASSET_ID,
          amount: SAMPLE_AMOUNT,
        } as never,
        {
          onOrderCreated: jest.fn(),
          onError: jest.fn(() => {
            throw new Error('consumer is bad');
          }),
          onClose: jest.fn(),
        },
      );
      renderHost({ headlessSessionId: session.id });
      // Even though onError throws, the close path still runs and the
      // session is gone from the registry.
      await waitFor(() => expect(getSession(session.id)).toBeUndefined());
    });
  });

  describe('Dismissal (Phase 8 + 9.5)', () => {
    it('registers a beforeRemove listener that synchronously closes the session with user_dismissed', () => {
      // Phase 9.5 replaces the old visible Cancel/Back buttons with a
      // navigation listener so the synchronous close still fires when the
      // user backs out — even with no chrome to render.
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      renderHost({ headlessSessionId: session.id });
      expect(mockAddListener).toHaveBeenCalledWith(
        'beforeRemove',
        expect.any(Function),
      );
      expect(typeof registeredBeforeRemoveListener).toBe('function');

      // Fire the listener like React Navigation would on a back gesture.
      registeredBeforeRemoveListener?.();

      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'user_dismissed',
      });
      expect(getSession(session.id)).toBeUndefined();
    });

    it('fires onClose({ reason: "user_dismissed" }) once when the host unmounts mid-flow without a terminal status', async () => {
      mockContinueWithQuote.mockImplementation(
        () => new Promise(() => undefined),
      );
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      const { unmount } = renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );

      unmount();

      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'user_dismissed',
      });
      expect(getSession(session.id)).toBeUndefined();
    });

    it('does not fire a second onClose when the session was already closed by Phase 6 success before unmount', async () => {
      mockContinueWithQuote.mockImplementation(
        () => new Promise(() => undefined),
      );
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      const { unmount } = renderHost({ headlessSessionId: session.id });
      await waitFor(() =>
        expect(mockContinueWithQuote).toHaveBeenCalledTimes(1),
      );

      // Simulate Phase 6: useTransakRouting / Checkout fires
      // closeSession({ reason: 'completed' }) after onOrderCreated.
      closeSession(session.id, { reason: 'completed' });
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'completed' });

      // beforeRemove fires too (React Navigation always fires it on screen
      // removal), then unmount cleanup runs. Both find the session gone and
      // no-op.
      registeredBeforeRemoveListener?.();
      unmount();

      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    it('does not fire a second onClose when a Phase 7 nativeFlowError already closed the session before unmount', () => {
      const quote = buildNativeQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      const { unmount } = renderHost({
        headlessSessionId: session.id,
        nativeFlowError: 'OTP rejected',
      });

      // Phase 7: nativeFlowError handler funnels through failSession →
      // closeSession({ reason: 'unknown' }, { terminalStatus: 'failed' }).
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({ reason: 'unknown' });

      registeredBeforeRemoveListener?.();
      unmount();

      // Both follow-up paths re-read, see nothing, no-op.
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });

    it('no-ops on unmount when the host mounted against an already-terminated session', () => {
      const quote = buildAggregatorQuote();
      const session = seedSession(quote);
      const callbacks = session.callbacks;
      // Cancel before the screen mounts; the Phase 8 dismissal cleanup must
      // not produce a spurious second onClose.
      closeSession(session.id, { reason: 'consumer_cancelled' });
      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
      expect(callbacks.onClose).toHaveBeenCalledWith({
        reason: 'consumer_cancelled',
      });

      const { unmount } = renderHost({ headlessSessionId: session.id });
      registeredBeforeRemoveListener?.();
      unmount();

      expect(callbacks.onClose).toHaveBeenCalledTimes(1);
    });
  });
});
