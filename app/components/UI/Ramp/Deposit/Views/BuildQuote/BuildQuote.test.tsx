import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';
import {
  DepositCryptoCurrency,
  DepositFiatCurrency,
  DepositPaymentMethod,
} from '../../constants';
import { BuyQuote } from '@consensys/native-ramps-sdk';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockGetQuote = jest.fn();
const mockFetchKycForms = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();
const mockGetTransakFiatCurrencyId = jest.fn();
const mockGetTransakCryptoCurrencyId = jest.fn();
const mockGetTransakChainId = jest.fn();
const mockGetTransakPaymentMethodId = jest.fn();

const mockQuote = { quoteId: 'test-quote' } as unknown as BuyQuote;
const mockForms = { forms: [] };

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

jest.mock('../../../../Navbar', () => ({
  getDepositNavbarOptions: jest.fn().mockReturnValue({
    title: 'Build Quote',
  }),
}));

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
  DepositSDKProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn().mockImplementation((config) => {
    if (config?.method === 'getBuyQuote' || config === 'getBuyQuote') {
      return [{ error: null }, mockGetQuote];
    }
    if (config?.method === 'getKYCForms') {
      return [{ error: null }, mockFetchKycForms];
    }
    return [{ error: null }, jest.fn()];
  }),
}));

jest.mock('../../hooks/useDepositTokenExchange', () => ({
  __esModule: true,
  default: () => mockUseDepositTokenExchange(),
}));

jest.mock('../../utils', () => ({
  getTransakFiatCurrencyId: (fiatCurrency: DepositFiatCurrency) =>
    mockGetTransakFiatCurrencyId(fiatCurrency),
  getTransakCryptoCurrencyId: (cryptoCurrency: DepositCryptoCurrency) =>
    mockGetTransakCryptoCurrencyId(cryptoCurrency),
  getTransakChainId: (chainId: string) => mockGetTransakChainId(chainId),
  getTransakPaymentMethodId: (paymentMethod: DepositPaymentMethod) =>
    mockGetTransakPaymentMethodId(paymentMethod),
}));

jest.mock('../ProviderWebview/ProviderWebview', () => ({
  createProviderWebviewNavDetails: jest.fn(({ quote }) => [
    'PROVIDER_WEBVIEW',
    { quote },
  ]),
}));

jest.mock('../BasicInfo/BasicInfo', () => ({
  createBasicInfoNavDetails: jest.fn(({ quote }) => ['BASIC_INFO', { quote }]),
}));

jest.mock('../EnterEmail/EnterEmail', () => ({
  createEnterEmailNavDetails: jest.fn(({ quote }) => [
    'ENTER_EMAIL',
    { quote },
  ]),
}));

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.BUILD_QUOTE);
}

describe('BuildQuote Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSDK.mockReturnValue({
      isAuthenticated: false,
    });
    mockUseDepositTokenExchange.mockReturnValue({
      tokenAmount: '0.00',
    });
    mockGetTransakFiatCurrencyId.mockReturnValue('USD');
    mockGetTransakCryptoCurrencyId.mockReturnValue('USDC');
    mockGetTransakChainId.mockReturnValue('ethereum');
    mockGetTransakPaymentMethodId.mockReturnValue('credit_debit_card');
  });

  it('render matches snapshot', () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Keypad Functionality', () => {
    it('updates amount when keypad is used', () => {
      render(BuildQuote);

      const oneButton = screen.getByText('1');
      fireEvent.press(oneButton);

      expect(screen.getByText('$1.00')).toBeTruthy();
    });

    it('displays converted token amount', () => {
      mockUseDepositTokenExchange.mockReturnValue({
        tokenAmount: '1.5',
      });

      render(BuildQuote);

      expect(screen.getByText('1.5 USDC')).toBeTruthy();
    });
  });

  describe('Continue button functionality', () => {
    it('calls getQuote with transformed parameters using utility functions', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockGetTransakFiatCurrencyId).toHaveBeenCalled();
        expect(mockGetTransakCryptoCurrencyId).toHaveBeenCalled();
        expect(mockGetTransakChainId).toHaveBeenCalled();
        expect(mockGetTransakPaymentMethodId).toHaveBeenCalled();
        expect(mockGetQuote).toHaveBeenCalledWith(
          'USD',
          'USDC',
          'ethereum',
          'credit_debit_card',
          '0',
        );
      });
    });

    it('handles errors from utility functions', async () => {
      mockGetTransakFiatCurrencyId.mockImplementation(() => {
        throw new Error('Unsupported fiat currency');
      });

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockGetQuote).not.toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });

    it('calls fetchKycForms with the quote when getQuote succeeds', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycForms).toHaveBeenCalledWith(mockQuote);
      });
    });

    it('navigates to provider webview when user is authenticated and no forms required', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PROVIDER_WEBVIEW', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to basic info when user is authenticated and forms required', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue({ forms: ['kyc_form'] });

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to enter email when user is not authenticated', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('ENTER_EMAIL', {
          quote: mockQuote,
        });
      });
    });

    it('renders quote fetch error snapshot when getQuote fails', async () => {
      const mockError = new Error('Failed to fetch quote');

      mockGetQuote.mockRejectedValue(mockError);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('renders KYC forms fetch error snapshot when fetchKycForms fails', async () => {
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockRejectedValue(
        new Error('Failed to fetch KYC forms'),
      );

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('renders unexpected error snapshot when an unexpected error occurs', async () => {
      mockGetTransakFiatCurrencyId.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('renders success state snapshot when quote and KYC forms are fetched successfully', async () => {
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });
  });
});
