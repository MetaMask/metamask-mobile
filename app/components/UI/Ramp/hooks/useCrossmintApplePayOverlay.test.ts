import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import { useRampsController } from './useRampsController';
import useCrossmintApplePayOverlay from './useCrossmintApplePayOverlay';
import type { Quote } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

jest.mock('./useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('./useRampAccountAddress', () => ({
  __esModule: true,
  default: jest.fn(() => '0x1234567890123456789012345678901234567890'),
}));

jest.mock('../../../../util/device', () => ({
  __esModule: true,
  default: {
    isIos: jest.fn(() => true),
    isAndroid: jest.fn(() => false),
  },
}));

jest.mock('../utils/getRampCallbackBaseUrl', () => ({
  getRampCallbackBaseUrl: jest.fn(() => 'https://callback.test/'),
}));

jest.mock('../utils/buildQuoteWithRedirectUrl', () => ({
  buildQuoteWithRedirectUrl: jest.fn((quote: unknown) => quote),
  getCheckoutContext: jest.fn(
    (_token: unknown, walletAddress: string, orderId?: string | null) => ({
      network: 'solana',
      effectiveWallet: walletAddress,
      effectiveOrderId: orderId ?? null,
    }),
  ),
}));

const mockGetBuyWidgetData = jest.fn();
const mockAddPrecreatedOrder = jest.fn();

const crossmintQuote = {
  provider: '/providers/crossmint-staging',
  quote: {
    buyURL: 'https://on-ramp.dev-api.cx.metamask.io/buy-widget',
  },
} as unknown as Quote;

const otherProviderQuote = {
  provider: '/providers/moonpay',
  quote: {
    buyURL: 'https://on-ramp.dev-api.cx.metamask.io/buy-widget',
  },
} as unknown as Quote;

function setupController({
  paymentMethodId = '/payments/apple-pay',
}: { paymentMethodId?: string } = {}) {
  jest.mocked(useRampsController).mockReturnValue({
    selectedToken: {
      assetId: 'solana:5eykt/token:mint123',
      chainId: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
    },
    selectedPaymentMethod: { id: paymentMethodId },
    getBuyWidgetData: mockGetBuyWidgetData,
    addPrecreatedOrder: mockAddPrecreatedOrder,
  } as unknown as ReturnType<typeof useRampsController>);
}

describe('useCrossmintApplePayOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(useSelector).mockReturnValue(true);
    jest.mocked(Device.isIos).mockReturnValue(true);
    setupController();
    mockGetBuyWidgetData.mockResolvedValue({
      url: 'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=abc',
      orderId: 'custom-order-id-1',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  async function settle() {
    await act(async () => {
      jest.advanceTimersByTime(500);
      await Promise.resolve();
    });
  }

  it('prepares the checkout URL and registers a precreated order', async () => {
    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    expect(result.current.isEligible).toBe(true);
    expect(result.current.checkoutUrl).toBeNull();

    await settle();

    expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(1);
    expect(mockAddPrecreatedOrder).toHaveBeenCalledWith({
      orderId: 'custom-order-id-1',
      providerCode: '/providers/crossmint-staging',
      walletAddress: '0x1234567890123456789012345678901234567890',
      chainId: 'solana',
    });
    expect(result.current.checkoutUrl).toBe(
      'https://staging.crossmint.com/sdk/2024-03-05/embedded-checkout?orderId=abc',
    );
  });

  it('does not create a duplicate order for the same quote parameters', async () => {
    const { result, rerender } = renderHook(
      ({ quote, amount }: { quote: Quote; amount: number }) =>
        useCrossmintApplePayOverlay(quote, amount),
      { initialProps: { quote: crossmintQuote, amount: 25 } },
    );

    await settle();
    expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(1);

    // A polling refresh yields a new quote object with the same parameters.
    rerender({ quote: { ...crossmintQuote } as Quote, amount: 25 });
    await settle();

    expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(1);
    expect(result.current.checkoutUrl).not.toBeNull();
  });

  it('prepares a new order when the amount changes', async () => {
    const { rerender } = renderHook(
      ({ quote, amount }: { quote: Quote; amount: number }) =>
        useCrossmintApplePayOverlay(quote, amount),
      { initialProps: { quote: crossmintQuote, amount: 25 } },
    );

    await settle();
    rerender({ quote: crossmintQuote, amount: 50 });
    await settle();

    expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(2);
  });

  it('is not eligible when the feature flag is disabled', async () => {
    jest.mocked(useSelector).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(result.current.checkoutUrl).toBeNull();
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible for non-Crossmint quotes', async () => {
    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(otherProviderQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible for non-Apple Pay payment methods', async () => {
    setupController({ paymentMethodId: '/payments/debit-credit-card' });

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible on Android', async () => {
    jest.mocked(Device.isIos).mockReturnValue(false);

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible without a quote', async () => {
    const { result } = renderHook(() => useCrossmintApplePayOverlay(null, 25));

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('keeps the checkout URL null when widget preparation fails', async () => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    mockGetBuyWidgetData.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.checkoutUrl).toBeNull();
    expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
    expect(Logger.error).toHaveBeenCalled();
  });

  it('does not register an order when the widget has no order id', async () => {
    mockGetBuyWidgetData.mockResolvedValue({
      url: 'https://staging.crossmint.com/sdk/embedded-checkout',
      orderId: undefined,
    });

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(mockAddPrecreatedOrder).not.toHaveBeenCalled();
    expect(result.current.checkoutUrl).toBe(
      'https://staging.crossmint.com/sdk/embedded-checkout',
    );
  });

  it('logs Crossmint failure events from WebView messages', () => {
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    act(() => {
      result.current.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            event: 'order:creation-failed',
            data: { message: 'Daily limit exceeded' },
          }),
        },
      } as never);
    });

    expect(loggerSpy).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Daily limit exceeded' }),
      expect.objectContaining({
        message: 'useCrossmintApplePayOverlay Crossmint checkout failure',
      }),
    );
  });

  it('ignores unparseable WebView messages', () => {
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useCrossmintApplePayOverlay(crossmintQuote, 25),
    );

    act(() => {
      result.current.onMessage({
        nativeEvent: { data: 'not-json' },
      } as never);
    });

    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
