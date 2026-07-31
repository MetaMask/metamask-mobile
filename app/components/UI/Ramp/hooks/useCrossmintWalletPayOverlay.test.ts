import { renderHook, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import Device from '../../../../util/device';
import Logger from '../../../../util/Logger';
import { useRampsController } from './useRampsController';
import useCrossmintWalletPayOverlay from './useCrossmintWalletPayOverlay';
import type { Quote } from '../types';

jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

const mockNavigationReset = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({ reset: mockNavigationReset })),
}));

const mockGetOrderById = jest.fn();
jest.mock('./useRampsOrders', () => ({
  useRampsOrders: jest.fn(() => ({ getOrderById: mockGetOrderById })),
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

function setPlatform(platform: 'ios' | 'android') {
  jest.mocked(Device.isIos).mockReturnValue(platform === 'ios');
  jest.mocked(Device.isAndroid).mockReturnValue(platform === 'android');
}

describe('useCrossmintWalletPayOverlay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.mocked(useSelector).mockReturnValue(true);
    setPlatform('ios');
    setupController();
    mockGetOrderById.mockReturnValue(undefined);
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
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
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

  it('is eligible for Google Pay on Android', async () => {
    setPlatform('android');
    setupController({ paymentMethodId: '/payments/google-pay' });

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    expect(result.current.isEligible).toBe(true);

    await settle();

    expect(mockGetBuyWidgetData).toHaveBeenCalledTimes(1);
    expect(result.current.checkoutUrl).not.toBeNull();
  });

  it('is not eligible for Google Pay on iOS', async () => {
    setupController({ paymentMethodId: '/payments/google-pay' });

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible for Apple Pay on Android', async () => {
    setPlatform('android');
    setupController({ paymentMethodId: '/payments/apple-pay' });

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('does not create a duplicate order for the same quote parameters', async () => {
    const { result, rerender } = renderHook(
      ({ quote, amount }: { quote: Quote; amount: number }) =>
        useCrossmintWalletPayOverlay(quote, amount),
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
        useCrossmintWalletPayOverlay(quote, amount),
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
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(result.current.checkoutUrl).toBeNull();
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible for non-Crossmint quotes', async () => {
    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(otherProviderQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible for non-wallet-pay payment methods', async () => {
    setupController({ paymentMethodId: '/payments/debit-credit-card' });

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('is not eligible without a quote', async () => {
    const { result } = renderHook(() => useCrossmintWalletPayOverlay(null, 25));

    await settle();

    expect(result.current.isEligible).toBe(false);
    expect(mockGetBuyWidgetData).not.toHaveBeenCalled();
  });

  it('keeps the checkout URL null when widget preparation fails', async () => {
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
    mockGetBuyWidgetData.mockRejectedValue(new Error('network error'));

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
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
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
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
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
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
        message: 'useCrossmintWalletPayOverlay Crossmint checkout failure',
      }),
    );
  });

  it('hands off to OrderDetails when the WebView reports payment in progress', async () => {
    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );
    await settle();

    act(() => {
      result.current.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            event: 'order:updated',
            data: { order: { payment: { status: 'in-progress' } } },
          }),
        },
      } as never);
    });

    expect(mockNavigationReset).toHaveBeenCalledTimes(1);
    expect(mockNavigationReset).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 0,
        routes: [
          expect.objectContaining({
            name: expect.any(String),
            params: expect.objectContaining({
              orderId: 'custom-order-id-1',
              showCloseButton: true,
            }),
          }),
        ],
      }),
    );
  });

  it('hands off to OrderDetails when the WebView reports payment completed', async () => {
    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );
    await settle();

    act(() => {
      result.current.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            event: 'order:updated',
            data: { order: { payment: { status: 'completed' } } },
          }),
        },
      } as never);
    });

    expect(mockNavigationReset).toHaveBeenCalledTimes(1);
  });

  it('hands off only once for repeated payment updates', async () => {
    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );
    await settle();

    const paymentMessage = {
      nativeEvent: {
        data: JSON.stringify({
          event: 'order:updated',
          data: { order: { payment: { status: 'in-progress' } } },
        }),
      },
    } as never;

    act(() => {
      result.current.onMessage(paymentMessage);
      result.current.onMessage(paymentMessage);
    });

    expect(mockNavigationReset).toHaveBeenCalledTimes(1);
  });

  it('does not hand off while payment has not been authorized', async () => {
    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );
    await settle();

    act(() => {
      result.current.onMessage({
        nativeEvent: {
          data: JSON.stringify({
            event: 'order:updated',
            data: { order: { payment: { status: 'awaiting-payment' } } },
          }),
        },
      } as never);
    });

    expect(mockNavigationReset).not.toHaveBeenCalled();
  });

  it('hands off when the polled order status advances past CREATED', async () => {
    mockGetOrderById.mockImplementation((orderId: string) =>
      orderId === 'custom-order-id-1' ? { status: 'PENDING' } : undefined,
    );

    renderHook(() => useCrossmintWalletPayOverlay(crossmintQuote, 25));
    await settle();

    expect(mockNavigationReset).toHaveBeenCalledTimes(1);
    expect(mockNavigationReset).toHaveBeenCalledWith(
      expect.objectContaining({
        routes: [
          expect.objectContaining({
            params: expect.objectContaining({ orderId: 'custom-order-id-1' }),
          }),
        ],
      }),
    );
  });

  it('does not hand off while the polled order is still precreated or created', async () => {
    mockGetOrderById.mockReturnValue({ status: 'PRECREATED' });

    renderHook(() => useCrossmintWalletPayOverlay(crossmintQuote, 25));
    await settle();

    expect(mockNavigationReset).not.toHaveBeenCalled();

    mockGetOrderById.mockReturnValue({ status: 'CREATED' });
    renderHook(() => useCrossmintWalletPayOverlay(crossmintQuote, 25));
    await settle();

    expect(mockNavigationReset).not.toHaveBeenCalled();
  });

  it('ignores unparseable WebView messages', () => {
    const loggerSpy = jest
      .spyOn(Logger, 'error')
      .mockImplementation(() => undefined);

    const { result } = renderHook(() =>
      useCrossmintWalletPayOverlay(crossmintQuote, 25),
    );

    act(() => {
      result.current.onMessage({
        nativeEvent: { data: 'not-json' },
      } as never);
    });

    expect(loggerSpy).not.toHaveBeenCalled();
  });
});
