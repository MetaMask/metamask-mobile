import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import HeadlessHost, {
  HEADLESS_HOST_BACK_BUTTON_TEST_ID,
  HEADLESS_HOST_CANCEL_BUTTON_TEST_ID,
  HEADLESS_HOST_LOADER_TEST_ID,
  HEADLESS_HOST_NO_SESSION_TEST_ID,
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
const mockContinueWithQuote = jest.fn();
const mockUseContinueWithQuoteOptions = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
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

    it('renders the no-session message when the session id is unknown', () => {
      renderHost({ headlessSessionId: 'headless-buy-not-real' });
      expect(
        screen.getByTestId(HEADLESS_HOST_NO_SESSION_TEST_ID),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(HEADLESS_HOST_LOADER_TEST_ID),
      ).not.toBeOnTheScreen();
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });

    it('renders the loader while a matching session is being orchestrated', () => {
      // Make continueWithQuote hang so the loader stays on screen.
      mockContinueWithQuote.mockImplementation(
        () => new Promise(() => undefined),
      );
      const session = seedSession(buildAggregatorQuote());
      renderHost({ headlessSessionId: session.id });
      expect(
        screen.getByTestId(HEADLESS_HOST_LOADER_TEST_ID),
      ).toBeOnTheScreen();
    });

    it('navigates back when the cancel button is pressed', () => {
      renderHost();
      fireEvent.press(screen.getByTestId(HEADLESS_HOST_CANCEL_BUTTON_TEST_ID));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('navigates back when the header back button is pressed', () => {
      renderHost();
      fireEvent.press(screen.getByTestId(HEADLESS_HOST_BACK_BUTTON_TEST_ID));
      expect(mockGoBack).toHaveBeenCalledTimes(1);
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
      // No session left → the no-session branch renders, continueWithQuote
      // is never called.
      expect(
        screen.getByTestId(HEADLESS_HOST_NO_SESSION_TEST_ID),
      ).toBeOnTheScreen();
      expect(mockContinueWithQuote).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('forwards a malformed assetId as onError(UNKNOWN, ...) and closes the session', () => {
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

    it('surfaces a continueWithQuote rejection as onError(UNKNOWN, ...) and renders the message', async () => {
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
      expect(screen.getByText('quote expired')).toBeOnTheScreen();
    });

    it('forwards a nativeFlowError param as onError(AUTH_FAILED, ...), renders it, and closes the session', () => {
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
      expect(screen.getByText('OTP rejected')).toBeOnTheScreen();
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
});
