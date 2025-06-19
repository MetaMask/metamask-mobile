import React from 'react';
import { screen } from '@testing-library/react-native';
import ProviderWebview from './ProviderWebview';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import { useDepositSdkMethod } from '../../hooks/useDepositSdkMethod';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockGeneratePaymentUrl = jest.fn();

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

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.PROVIDER_WEBVIEW);
}

// Helper function to set up useDepositSdkMethod mocks
function setupDepositSdkMocks(
  ottData: any = null,
  ottError: string | null = null,
  ottIsFetching: boolean = false,
  paymentUrlData: any = null,
  paymentUrlError: string | null = null,
  paymentUrlIsFetching: boolean = false,
) {
  (useDepositSdkMethod as jest.Mock).mockImplementation((options: { method: string }) => {
    if (options.method === 'requestOtt') {
      return [
        { data: ottData, error: ottError, isFetching: ottIsFetching },
        jest.fn(),
      ];
    }
    if (options.method === 'generatePaymentWidgetUrl') {
      return [
        { data: paymentUrlData, error: paymentUrlError, isFetching: paymentUrlIsFetching },
        mockGeneratePaymentUrl,
      ];
    }
    return [{ data: null, error: null, isFetching: false }, jest.fn()];
  });
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
});
