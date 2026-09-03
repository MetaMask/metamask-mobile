import { renderHook, act } from '@testing-library/react-native';
import { TransactionType } from '@metamask/transaction-controller';
import {
  getFiatFunnelRampSurface,
  useFiatPaymentSelectorMetrics,
  useFiatFunnelMetrics,
  type FiatFunnelMetricsInput,
} from './useFiatFunnelMetrics';
import { RAMP_SURFACE } from '../types/depositAnalytics';
import type { Quote } from '../types';

const REGION = 'us-ca';
const PM_ID = '/payments/debit-credit-card';

const mockTrackEvent = jest.fn();
jest.mock('./useAnalytics', () => ({
  __esModule: true,
  default: () => mockTrackEvent,
}));

interface RampsUserRegionMockReturn {
  userRegion: { regionCode: string } | null;
  setUserRegion: jest.Mock;
}

const mockUseRampsUserRegion = jest.fn(
  (): RampsUserRegionMockReturn => ({
    userRegion: { regionCode: REGION },
    setUserRegion: jest.fn(),
  }),
);
jest.mock('./useRampsUserRegion', () => ({
  useRampsUserRegion: () => mockUseRampsUserRegion(),
}));

const RAMPS_QUOTE_MOCK = {
  provider: '/providers/transak',
  quote: {
    amountIn: 100,
    amountOut: 0.05,
    paymentMethod: PM_ID,
    totalFees: 5,
    networkFee: 2,
    providerFee: 3,
  },
} as unknown as Quote;

const EXPECTED_BASE = {
  ramp_type: 'HEADLESS',
  ramp_surface: RAMP_SURFACE.MONEY_ACCOUNT,
  region: REGION,
};

const BASE_INPUT: FiatFunnelMetricsInput = {
  rampSurface: RAMP_SURFACE.MONEY_ACCOUNT,
  region: REGION,
  selectedPaymentMethodId: PM_ID,
  amountFiat: '100',
  assetId: 'eip155:1/slip44:60',
};

/** First payload `trackEvent` was called with for `event`, or undefined. */
function payloadFor(event: string): Record<string, unknown> | undefined {
  return mockTrackEvent.mock.calls.find(([type]) => type === event)?.[1];
}

/** How many times `event` was emitted. */
function emitCount(event: string): number {
  return mockTrackEvent.mock.calls.filter(([type]) => type === event).length;
}

function renderFunnel(overrides: Partial<FiatFunnelMetricsInput> = {}) {
  return renderHook(
    ({ input }: { input: FiatFunnelMetricsInput }) =>
      useFiatFunnelMetrics(input),
    { initialProps: { input: { ...BASE_INPUT, ...overrides } } },
  );
}

describe('useFiatFunnelMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: { regionCode: REGION },
      setUserRegion: jest.fn(),
    });
  });

  // Each emitted event keeps its full payload (proves no analytics regression).
  describe('money_account (HEADLESS) payloads', () => {
    it('emits the imperative events with their payloads', () => {
      const { result } = renderFunnel();
      act(() => {
        result.current.trackScreenViewed();
        result.current.trackAmountCommitted();
        result.current.trackPaymentSelectorOpened();
        result.current.trackContinue();
      });

      expect(payloadFor('RAMPS_SCREEN_VIEWED')).toEqual({
        ...EXPECTED_BASE,
        location: 'Amount Input',
      });
      expect(payloadFor('RAMPS_ORDER_PROPOSED')).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        amount_destination: 0, // no quote yet at amount-commit
        payment_method_id: PM_ID,
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
        is_authenticated: false,
      });
      expect(payloadFor('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED')).toEqual({
        ...EXPECTED_BASE,
        location: 'Amount Input',
        current_payment_method: PM_ID,
      });
      expect(payloadFor('RAMPS_CONTINUE_BUTTON_CLICKED')).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        payment_method_id: PM_ID,
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
      });
    });

    it('emits RAMPS_PAYMENT_METHOD_SELECTED reactively for a selected method', () => {
      renderFunnel();

      expect(payloadFor('RAMPS_PAYMENT_METHOD_SELECTED')).toEqual({
        ...EXPECTED_BASE,
        payment_method_id: PM_ID,
        is_authenticated: false,
      });
    });

    it('emits RAMPS_ORDER_SELECTED reactively with the fee breakdown', () => {
      renderFunnel({ rampsQuote: RAMPS_QUOTE_MOCK });

      expect(payloadFor('RAMPS_ORDER_SELECTED')).toEqual({
        ...EXPECTED_BASE,
        amount_source: 100,
        amount_destination: 0.05,
        exchange_rate: 1900, // (100 - 5) / 0.05
        total_fee: 5,
        gas_fee: 2,
        processing_fee: 3,
        payment_method_id: PM_ID,
        currency_destination: 'eip155:1/slip44:60',
        currency_source: 'USD',
        chain_id: 'eip155:1',
      });
    });

    it('emits RAMPS_QUOTE_ERROR reactively for an active quote error', () => {
      renderFunnel({
        quoteError: { key: 'x', message: 'No quotes available' },
      });

      expect(payloadFor('RAMPS_QUOTE_ERROR')).toEqual({
        ...EXPECTED_BASE,
        error_message: 'No quotes available',
        amount: 100,
        currency_source: 'USD',
        currency_destination: 'eip155:1/slip44:60',
        payment_method_id: PM_ID,
      });
    });
  });

  it('does not emit RAMPS_ORDER_PROPOSED when the committed amount is zero', () => {
    const { result } = renderFunnel({ amountFiat: '0' });
    act(() => result.current.trackAmountCommitted());

    expect(payloadFor('RAMPS_ORDER_PROPOSED')).toBeUndefined();
  });

  it('falls back to empty chain_id and reads crypto-out from the quote', () => {
    const { result } = renderFunnel({
      rampsQuote: RAMPS_QUOTE_MOCK,
      assetId: 'not-a-caip',
    });
    act(() => result.current.trackAmountCommitted());

    expect(payloadFor('RAMPS_ORDER_PROPOSED')).toEqual(
      expect.objectContaining({ chain_id: '', amount_destination: 0.05 }),
    );
  });

  it('reports a zero exchange_rate when the quote has no crypto out', () => {
    renderFunnel({
      rampsQuote: {
        quote: { ...RAMPS_QUOTE_MOCK.quote, amountOut: 0 },
      } as unknown as Quote,
    });

    expect(payloadFor('RAMPS_ORDER_SELECTED')).toEqual(
      expect.objectContaining({ exchange_rate: 0 }),
    );
  });

  // Dedupe: re-render with a changed region (effects re-run) but the same
  // semantic key, to prove reactive events fire once per occurrence.
  it('does not re-emit RAMPS_SCREEN_VIEWED across calls', () => {
    const { result, rerender } = renderFunnel();
    act(() => result.current.trackScreenViewed());
    rerender({ input: { ...BASE_INPUT, region: 'us-ny' } });
    act(() => result.current.trackScreenViewed());

    expect(emitCount('RAMPS_SCREEN_VIEWED')).toBe(1);
  });

  it('does not re-emit the reactive quote/method events for unchanged values', () => {
    const { rerender } = renderFunnel({ rampsQuote: RAMPS_QUOTE_MOCK });
    rerender({
      input: { ...BASE_INPUT, rampsQuote: RAMPS_QUOTE_MOCK, region: 'us-ny' },
    });

    expect(emitCount('RAMPS_ORDER_SELECTED')).toBe(1);
    expect(emitCount('RAMPS_PAYMENT_METHOD_SELECTED')).toBe(1);
  });

  it('re-emits RAMPS_QUOTE_ERROR only after the error clears and recurs', () => {
    const quoteError = { key: 'x', message: 'No quotes' };
    const { rerender } = renderFunnel({ quoteError });
    rerender({ input: { ...BASE_INPUT, quoteError, region: 'us-ny' } });
    expect(emitCount('RAMPS_QUOTE_ERROR')).toBe(1);
    // Clears (resets the dedupe ref), then the same error recurs.
    rerender({ input: { ...BASE_INPUT, quoteError: undefined } });
    rerender({ input: { ...BASE_INPUT, quoteError } });
    expect(emitCount('RAMPS_QUOTE_ERROR')).toBe(2);
  });

  // Generic in structure: inert without a surface, tags whatever surface given.
  it('emits nothing (reactive or imperative) when rampSurface is undefined', () => {
    const { result } = renderFunnel({
      rampSurface: undefined,
      rampsQuote: RAMPS_QUOTE_MOCK,
      quoteError: { key: 'x', message: 'No quotes available' },
    });

    act(() => {
      result.current.trackScreenViewed();
      result.current.trackAmountCommitted();
      result.current.trackPaymentSelectorOpened();
      result.current.trackContinue();
    });

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });

  it.each([RAMP_SURFACE.PERPS, RAMP_SURFACE.PREDICTION])(
    'tags events with the given (non-money) ramp surface: %s',
    (rampSurface) => {
      const { result } = renderFunnel({ rampSurface });
      act(() => result.current.trackContinue());

      expect(payloadFor('RAMPS_CONTINUE_BUTTON_CLICKED')).toEqual(
        expect.objectContaining({ ramp_surface: rampSurface }),
      );
    },
  );
});

describe('getFiatFunnelRampSurface', () => {
  it.each([
    [TransactionType.moneyAccountDeposit, RAMP_SURFACE.MONEY_ACCOUNT],
    [TransactionType.perpsDeposit, undefined],
    [TransactionType.predictDeposit, undefined],
    [TransactionType.moneyAccountWithdraw, undefined],
    [TransactionType.musdConversion, undefined],
    [undefined, undefined],
  ])('maps %s to %s', (type, expected) => {
    expect(getFiatFunnelRampSurface(type)).toBe(expected);
  });
});

describe('useFiatPaymentSelectorMetrics', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: { regionCode: REGION },
      setUserRegion: jest.fn(),
    });
  });

  it('emits the selector-opened payload exactly once', () => {
    const { rerender } = renderHook(
      ({ currentPaymentMethodId }) =>
        useFiatPaymentSelectorMetrics({
          rampSurface: RAMP_SURFACE.MONEY_ACCOUNT,
          currentPaymentMethodId,
        }),
      { initialProps: { currentPaymentMethodId: PM_ID } },
    );

    rerender({ currentPaymentMethodId: '/payments/apple-pay' });

    expect(mockTrackEvent).toHaveBeenCalledTimes(1);
    expect(payloadFor('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED')).toEqual({
      ...EXPECTED_BASE,
      location: 'Amount Input',
      current_payment_method: PM_ID,
    });
  });

  it('falls back to an empty region when unavailable', () => {
    mockUseRampsUserRegion.mockReturnValue({
      userRegion: null,
      setUserRegion: jest.fn(),
    });

    renderHook(() =>
      useFiatPaymentSelectorMetrics({
        rampSurface: RAMP_SURFACE.MONEY_ACCOUNT,
        currentPaymentMethodId: PM_ID,
      }),
    );

    expect(payloadFor('RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED')).toEqual(
      expect.objectContaining({ region: '' }),
    );
  });

  it('emits nothing without a surface', () => {
    renderHook(() =>
      useFiatPaymentSelectorMetrics({
        rampSurface: undefined,
        currentPaymentMethodId: PM_ID,
      }),
    );

    expect(mockTrackEvent).not.toHaveBeenCalled();
  });
});
