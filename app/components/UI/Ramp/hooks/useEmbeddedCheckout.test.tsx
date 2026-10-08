import React from 'react';
import { render, renderHook } from '@testing-library/react-native';
import { View } from 'react-native';
import useEmbeddedCheckout from './useEmbeddedCheckout';
import useCrossmintWalletPayOverlay, {
  type UseCrossmintWalletPayOverlayResult,
} from './useCrossmintWalletPayOverlay';
import type { Quote } from '../types';

jest.mock('./useCrossmintWalletPayOverlay', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const mockOverlay = jest.fn((props: Record<string, unknown>) => (
  <View testID="mock-wallet-pay-overlay" {...props} />
));
jest.mock('../components/WalletPayCheckoutOverlay', () => ({
  __esModule: true,
  default: (props: Record<string, unknown>) => mockOverlay(props),
}));

const mockUseCrossmintWalletPayOverlay = jest.mocked(
  useCrossmintWalletPayOverlay,
);

const quote = { provider: '/providers/crossmint' } as Quote;
const onCheckoutReady = jest.fn();
const onMessage = jest.fn();

function crossmintResult(
  overrides: Partial<UseCrossmintWalletPayOverlayResult> = {},
): UseCrossmintWalletPayOverlayResult {
  return {
    isEligible: false,
    checkoutUrl: null,
    isPreparing: false,
    isCheckoutReady: false,
    isPaymentSettling: false,
    onCheckoutReady,
    onMessage,
    checkoutError: null,
    ...overrides,
  };
}

describe('useEmbeddedCheckout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards the quote and amount to the Crossmint overlay hook', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(crossmintResult());

    renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(mockUseCrossmintWalletPayOverlay).toHaveBeenCalledWith(quote, 250);
  });

  it.each([
    ['inactive', crossmintResult()],
    ['preparing', crossmintResult({ isEligible: true, isPreparing: true })],
    [
      'preparing',
      crossmintResult({
        isEligible: true,
        isPreparing: true,
        checkoutUrl: 'https://checkout.test',
      }),
    ],
    [
      'ready',
      crossmintResult({
        isEligible: true,
        checkoutUrl: 'https://checkout.test',
        isCheckoutReady: true,
      }),
    ],
    [
      'settling',
      crossmintResult({
        isEligible: true,
        checkoutUrl: 'https://checkout.test',
        isCheckoutReady: true,
        isPaymentSettling: true,
      }),
    ],
  ])('reports phase %s', (phase, result) => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(result);

    const { result: hook } = renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(hook.current.phase).toBe(phase);
  });

  it('stays out of ready when the button reports ready without a checkout URL', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(
      crossmintResult({ isEligible: true, isCheckoutReady: true }),
    );

    const { result } = renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(result.current.phase).toBe('inactive');
    expect(result.current.renderOverlay).toBeNull();
  });

  it('has nothing to render until a checkout URL exists', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(
      crossmintResult({ isEligible: true, isPreparing: true }),
    );

    const { result } = renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(result.current.renderOverlay).toBeNull();
  });

  it('renders the wallet-pay overlay with the Crossmint wiring and caller interactivity', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(
      crossmintResult({
        isEligible: true,
        checkoutUrl: 'https://checkout.test',
        isCheckoutReady: true,
        isPaymentSettling: true,
      }),
    );
    const { result } = renderHook(() => useEmbeddedCheckout(quote, 250));

    const { getByTestId } = render(
      result.current.renderOverlay?.({ interactive: false }) ?? <View />,
    );

    expect(getByTestId('mock-wallet-pay-overlay')).toBeOnTheScreen();
    expect(mockOverlay).toHaveBeenCalledWith({
      checkoutUrl: 'https://checkout.test',
      interactive: false,
      concealed: true,
      onMessage,
      onReady: onCheckoutReady,
    });
  });

  it('reports no error while the checkout is healthy', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(
      crossmintResult({
        isEligible: true,
        checkoutUrl: 'https://checkout.test',
      }),
    );

    const { result } = renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(result.current.error).toBeNull();
  });

  it('surfaces the provider reason once the checkout is torn down as unpurchasable', () => {
    mockUseCrossmintWalletPayOverlay.mockReturnValue(
      crossmintResult({
        isEligible: true,
        checkoutError: 'This item is not available for purchase',
      }),
    );

    const { result } = renderHook(() => useEmbeddedCheckout(quote, 250));

    expect(result.current.phase).toBe('inactive');
    expect(result.current.renderOverlay).toBeNull();
    expect(result.current.error).toBe(
      'This item is not available for purchase',
    );
  });
});
