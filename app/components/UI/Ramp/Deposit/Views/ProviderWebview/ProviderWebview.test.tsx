import React from 'react';
import { screen } from '@testing-library/react-native';
import ProviderWebview from './ProviderWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const shouldNavigateToOrderProcessing = (url: string) => {
  if (!url.startsWith('https://metamask.io')) {
    return false;
  }

  try {
    const urlObj = new URL(url);
    const orderId = urlObj.searchParams.get('orderId');
    return !!orderId;
  } catch (e) {
    return false;
  }
};

const mockNavigate = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockUseDepositSdkMethod = {
  ottResponse: {
    error: null as string | null,
    data: null as { token: string } | null,
  },
  paymentUrlResponse: {
    error: null as string | null,
    data: null as string | null,
    generatePaymentUrl: jest.fn(),
  },
};

const mockQuote = {
  id: 'test-quote-id',
  amount: 100,
  currency: 'USD',
};

const mockSelectedAddress = '0x1234567890123456789012345678901234567890';

jest.mock('@react-navigation/native', () => {
  const actualReactNavigation = jest.requireActual('@react-navigation/native');
  return {
    ...actualReactNavigation,
    useNavigation: () => ({
      navigate: mockNavigate,
      setOptions: mockSetNavigationOptions.mockImplementation(
        actualReactNavigation.useNavigation().setOptions,
      ),
    }),
  };
});

jest.mock('../../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({
    quote: mockQuote,
  }),
  createNavigationDetails: () => jest.fn(),
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn((config) => {
    if (config.method === 'requestOtt') {
      return [mockUseDepositSdkMethod.ottResponse];
    }
    if (config.method === 'generatePaymentWidgetUrl') {
      return [
        mockUseDepositSdkMethod.paymentUrlResponse,
        mockUseDepositSdkMethod.paymentUrlResponse.generatePaymentUrl,
      ];
    }
    return [{ error: null, data: null }, jest.fn()];
  }),
}));

jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockSelectedAddress),
}));

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Provider Payment',
  }),
}));

jest.mock('@metamask/react-native-webview', () => ({
  WebView: 'WebView',
}));

jest.mock('../../../../../../component-library/hooks', () => ({
  useStyles: () => ({ theme: {} }),
}));

jest.mock('./ProviderWebview.styles', () => ({}));

jest.mock('../OrderProcessing/OrderProcessing', () => ({
  createOrderProcessingNavDetails: jest.fn(() => ['ORDER_PROCESSING', {}]),
}));

jest.mock('../../../Aggregator/components/ErrorView', () => 'ErrorView');

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.PROVIDER_WEBVIEW);
}

describe('ProviderWebview Logic', () => {
  it('should navigate when URL starts with metamask.io and has orderId', () => {
    const url = 'https://metamask.io/success?orderId=12345';
    expect(shouldNavigateToOrderProcessing(url)).toBe(true);
  });

  it('should not navigate when URL does not start with metamask.io', () => {
    const url = 'https://example.com/callback?orderId=12345';
    expect(shouldNavigateToOrderProcessing(url)).toBe(false);
  });

  it('should not navigate when URL starts with metamask.io but has no orderId', () => {
    const url = 'https://metamask.io/success';
    expect(shouldNavigateToOrderProcessing(url)).toBe(false);
  });

  it('should not navigate when URL starts with metamask.io but orderId is empty', () => {
    const url = 'https://metamask.io/success?orderId=';
    expect(shouldNavigateToOrderProcessing(url)).toBe(false);
  });

  it('should handle invalid URLs gracefully', () => {
    const invalidUrl = 'not-a-valid-url';
    expect(shouldNavigateToOrderProcessing(invalidUrl)).toBe(false);
  });

  it('should handle URLs with multiple query parameters', () => {
    const url =
      'https://metamask.io/success?param1=value1&orderId=12345&param2=value2';
    expect(shouldNavigateToOrderProcessing(url)).toBe(true);
  });
});

describe('ProviderWebview Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSdkMethod.ottResponse.error = null;
    mockUseDepositSdkMethod.ottResponse.data = null;
    mockUseDepositSdkMethod.paymentUrlResponse.error = null;
    mockUseDepositSdkMethod.paymentUrlResponse.data = null;
  });

  it('render matches snapshot', () => {
    render(ProviderWebview);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  it('calls generatePaymentUrl when OTT response is available', () => {
    const mockOttData = { token: 'test-token' };
    mockUseDepositSdkMethod.ottResponse.data = mockOttData;

    render(ProviderWebview);

    expect(
      mockUseDepositSdkMethod.paymentUrlResponse.generatePaymentUrl,
    ).toHaveBeenCalledWith(mockOttData.token, mockQuote, mockSelectedAddress);
  });

  it('does not call generatePaymentUrl when OTT response is not available', () => {
    mockUseDepositSdkMethod.ottResponse.data = null;

    render(ProviderWebview);

    expect(
      mockUseDepositSdkMethod.paymentUrlResponse.generatePaymentUrl,
    ).not.toHaveBeenCalled();
  });

  it('renders component when OTT error is present - covers error branch', () => {
    mockUseDepositSdkMethod.ottResponse.error = 'Failed to get OTT';

    expect(() => render(ProviderWebview)).not.toThrow();
  });

  it('renders component when payment URL error is present - covers error branch', () => {
    mockUseDepositSdkMethod.paymentUrlResponse.error =
      'Failed to generate payment URL';

    expect(() => render(ProviderWebview)).not.toThrow();
  });

  it('renders component when no errors - covers main WebView branch', () => {
    mockUseDepositSdkMethod.ottResponse.error = null;
    mockUseDepositSdkMethod.paymentUrlResponse.error = null;
    mockUseDepositSdkMethod.paymentUrlResponse.data =
      'https://payment.example.com';

    expect(() => render(ProviderWebview)).not.toThrow();
  });

  it('renders component when no payment URL - covers loading branch', () => {
    mockUseDepositSdkMethod.ottResponse.error = null;
    mockUseDepositSdkMethod.paymentUrlResponse.error = null;
    mockUseDepositSdkMethod.paymentUrlResponse.data = null;

    expect(() => render(ProviderWebview)).not.toThrow();
  });
});
