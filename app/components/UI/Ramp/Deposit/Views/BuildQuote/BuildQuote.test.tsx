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
const mockFetchKycFormData = jest.fn();
const mockFetchUserDetails = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();
const mockGetTransakFiatCurrencyId = jest.fn();
const mockGetTransakCryptoCurrencyId = jest.fn();
const mockGetTransakChainId = jest.fn();
const mockGetTransakPaymentMethodId = jest.fn();

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
    if (config?.method === 'getKycForm') {
      return [{ error: null }, mockFetchKycFormData];
    }
    if (config?.method === 'getUserDetails') {
      return [{ error: null }, mockFetchUserDetails];
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
  createBasicInfoNavDetails: jest.fn(({ quote, kycUrl }) => [
    'BASIC_INFO',
    { quote, kycUrl },
  ]),
}));

jest.mock('../EnterEmail/EnterEmail', () => ({
  createEnterEmailNavDetails: jest.fn(({ quote }) => [
    'ENTER_EMAIL',
    { quote },
  ]),
}));

jest.mock('../KycWebview/KycWebview', () => ({
  createKycWebviewNavDetails: jest.fn(({ quote, kycUrl }) => [
    'KYC_WEBVIEW',
    { quote, kycUrl },
  ]),
}));

jest.mock('../KycProcessing/KycProcessing', () => ({
  createKycProcessingNavDetails: jest.fn(() => ['KYC_PROCESSING', {}]),
}));

jest.mock('../../hooks/useUserDetailsPolling', () => ({
  KycStatus: {
    APPROVED: 'APPROVED',
    PENDING: 'PENDING',
    REJECTED: 'REJECTED',
  },
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

  describe('Region Selection', () => {
    it('displays default US region on initial render', () => {
      render(BuildQuote);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('opens region modal when region button is pressed', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('updates fiat currency when selecting a supported region', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);
      const germanyElement = screen.getByText('Belgium');
      fireEvent.press(germanyElement);
      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('maintains country display when selecting a state', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const usElement = screen.getByText('United States');
      fireEvent.press(usElement);

      const alabamaElement = screen.getByText('Alabama');
      fireEvent.press(alabamaElement);

      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  describe('Keypad Functionality', () => {
    it('updates amount when keypad is used', () => {
      render(BuildQuote);

      const oneButton = screen.getByText('1');
      fireEvent.press(oneButton);

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('displays converted token amount', () => {
      mockUseDepositTokenExchange.mockReturnValue({
        tokenAmount: '1.5',
      });

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();
    });
  });

  describe('Continue button functionality', () => {
    it('calls getQuote with transformed parameters using utility functions', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = { forms: [] };

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
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = { forms: [] };

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

    it('navigates to ProviderWebview when user is authenticated and no forms are required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'APPROVED' } } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('PROVIDER_WEBVIEW', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to KycProcessing when user is authenticated, no forms required, but KYC not approved', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'PENDING' } } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('KYC_PROCESSING', {});
      });
    });

    it('navigates to BasicInfo when personalDetails form is required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = {
        forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('navigates to BasicInfo when address form is required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = {
        forms: [{ id: 'address' }, { id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('navigates to KycWebview when only idProof form is required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = {
        forms: [{ id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('KYC_WEBVIEW', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('handles case when idProof form exists but no form data is returned', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = {
        forms: [{ id: 'idProof' }],
      };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(null);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).not.toHaveBeenCalled();
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
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

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
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = { forms: [] };

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

    it('navigates to ProviderWebview when user is authenticated and no forms are required', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'APPROVED' } } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('PROVIDER_WEBVIEW', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to KycProcessing when user is authenticated, no forms required, but KYC not approved', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'PENDING' } } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('KYC_PROCESSING', {});
      });
    });

    it('navigates to BasicInfo when personalDetails form is required', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = {
        forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('navigates to BasicInfo when address form is required', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = {
        forms: [{ id: 'address' }, { id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('navigates to KycWebview when only idProof form is required', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = {
        forms: [{ id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        expect(mockNavigate).toHaveBeenCalledWith('KYC_WEBVIEW', {
          quote: mockQuote,
          kycUrl: 'test-kyc-url',
        });
      });
    });

    it('handles case when idProof form exists but no form data is returned', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;
      const mockForms = {
        forms: [{ id: 'idProof' }],
      };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(null);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchKycFormData).toHaveBeenCalledWith(mockQuote, {
          id: 'idProof',
        });
        // Should not navigate when idProofData is null
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
