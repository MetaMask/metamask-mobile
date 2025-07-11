import React from 'react';
import { screen, act } from '@testing-library/react-native';
import ProviderWebview from './ProviderWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';
import {
  OttResponse,
  DepositOrder,
  DepositOrderType,
} from '@consensys/native-ramps-sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockGeneratePaymentUrl = jest.fn();
const mockWebViewProps = {
  onNavigationStateChange: jest.fn(),
  onHttpError: jest.fn(),
};

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn(),
}));

jest.mock('../../../../../UI/Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Provider Webview',
  }),
}));

jest.mock('../OrderProcessing/OrderProcessing', () => ({
  createOrderProcessingNavDetails: jest.fn(({ orderId }) => [
    'OrderScreen',
    { orderId },
  ]),
}));

jest.mock('@metamask/react-native-webview', () => ({
  WebView: jest.fn(({ onNavigationStateChange, onHttpError }) => {
    mockWebViewProps.onNavigationStateChange = onNavigationStateChange;
    mockWebViewProps.onHttpError = onHttpError;
    return null;
  }),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.PROVIDER_WEBVIEW);
}

// Helper function to set up useDepositSdkMethod mocks
function setupDepositSdkMocks(
  ottData: OttResponse | null = null,
  ottError: string | null = null,
  ottIsFetching: boolean = false,
  paymentUrlData: string | null = null,
  paymentUrlError: string | null = null,
  paymentUrlIsFetching: boolean = false,
  orderData: Partial<DepositOrder> | null = null,
  orderError: string | null = null,
  orderIsFetching: boolean = false,
) {
  const mockGetOrder = jest.fn().mockResolvedValue(orderData);

  (useDepositSdkMethod as jest.Mock).mockImplementation(
    (options: string | { method: string }) => {
      const method = typeof options === 'string' ? options : options.method;

      if (method === 'requestOtt') {
        return [
          { data: ottData, error: ottError, isFetching: ottIsFetching },
          jest.fn(),
        ];
      }
      if (method === 'generatePaymentWidgetUrl') {
        return [
          {
            data: paymentUrlData,
            error: paymentUrlError,
            isFetching: paymentUrlIsFetching,
          },
          mockGeneratePaymentUrl,
        ];
      }
      if (method === 'getOrder') {
        return [
          { data: orderData, error: orderError, isFetching: orderIsFetching },
          mockGetOrder,
        ];
      }
      return [{ data: null, error: null, isFetching: false }, jest.fn()];
    },
  );
}

describe('ProviderWebview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGeneratePaymentUrl.mockResolvedValue(undefined);
    setupDepositSdkMocks(); // Default state
  });

  it('renders default state correctly', () => {
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls setOptions when the component mounts', () => {
    render(ProviderWebview);
    expect(mockSetNavigationOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Provider Webview',
      }),
    );
  });

  it('renders loading state correctly', () => {
    setupDepositSdkMocks(null, null, true);
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders error state correctly', () => {
    const errorMessage = 'Network error';
    setupDepositSdkMocks(null, errorMessage, false);
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders loading when no payment URL is available', () => {
    setupDepositSdkMocks({ token: 'test-token' }, null, false);
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('renders webview when payment URL is available', () => {
    setupDepositSdkMocks(
      { token: 'test-token' },
      null,
      false,
      'https://test-payment-url.com',
      null,
      false,
    );
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('navigates to order processing when URL contains orderId', async () => {
    const mockOrder: Partial<DepositOrder> = {
      id: 'abc123',
      provider: 'test-provider',
      createdAt: 1673886669608,
      fiatAmount: 123,
      totalFeesFiat: 9,
      cryptoAmount: 0.012361263,
      cryptoCurrency: 'BTC',
      fiatCurrency: 'USD',
      network: 'ethereum',
      status: 'COMPLETED',
      orderType: DepositOrderType.Deposit,
      walletAddress: '0x1234',
      txHash: '0x987654321',
    };

    setupDepositSdkMocks(
      { token: 'test-token' },
      null,
      false,
      'https://test-payment-url.com',
      null,
      false,
      mockOrder,
      null,
      false,
    );

    render(ProviderWebview);

    // Simulate navigation state change
    await act(async () => {
      await mockWebViewProps.onNavigationStateChange({
        url: 'https://metamask.io/checkout?orderId=abc123',
      });
    });

    expect(mockNavigate).toHaveBeenCalledWith('OrderScreen', {
      orderId: 'abc123',
    });
  });

  it('does not navigate if URL is not the redirect URL', () => {
    setupDepositSdkMocks(
      { token: 'test-token' },
      null,
      false,
      'https://test-payment-url.com',
      null,
      false,
    );

    render(ProviderWebview);

    mockWebViewProps.onNavigationStateChange({
      url: 'https://test-payment-url.com',
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('handles webview HTTP error and shows error state', () => {
    setupDepositSdkMocks(
      { token: 'test-token' },
      null,
      false,
      'https://test-payment-url.com',
      null,
      false,
    );

    render(ProviderWebview);

    mockWebViewProps.onHttpError({
      nativeEvent: {
        url: 'https://test-payment-url.com',
        statusCode: 500,
      },
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('resets state when error view retry is triggered', () => {
    setupDepositSdkMocks(
      { token: 'test-token' },
      null,
      false,
      'https://test-payment-url.com',
      null,
      false,
    );

    render(ProviderWebview);

    act(() => {
      mockWebViewProps.onHttpError({
        nativeEvent: {
          url: 'https://test-payment-url.com',
          statusCode: 500,
        },
      });
    });

    const errorView = screen.root.findByProps({ location: 'Provider Webview' });
    const ctaOnPress = errorView.props.ctaOnPress;

    act(() => {
      ctaOnPress();
    });

    expect(screen.toJSON()).toMatchSnapshot();
  });
});
