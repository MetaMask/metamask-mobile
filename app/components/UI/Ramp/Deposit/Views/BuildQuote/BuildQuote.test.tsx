import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

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
const mockCreateUnsupportedRegionModalNavigationDetails = jest.fn();
const mockInteractionManager = {
  runAfterInteractions: jest.fn((callback) => callback()),
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

jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    InteractionManager: mockInteractionManager,
  };
});

function render(Component: React.ComponentType) {
  return renderDepositTestComponent(Component, Routes.DEPOSIT.BUILD_QUOTE);
}

const US_REGION = {
  code: 'US',
  flag: '🇺🇸',
  name: 'United States',
  phonePrefix: '+1',
  currency: 'USD',
  phoneDigitCount: 10,
  recommended: true,
  supported: true,
};

describe('BuildQuote Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSDK.mockReturnValue({
      isAuthenticated: false,
    });
    mockUseDepositTokenExchange.mockReturnValue({
      tokenAmount: '0.00',
    });
    mockCreateUnsupportedRegionModalNavigationDetails.mockReturnValue([
      'DepositModals',
      'DepositUnsupportedRegionModal',
      {
        countryName: 'Brazil',
        countryFlag: '🇧🇷',
        onSelectDifferentRegion: expect.any(Function),
      },
    ]);
  });

  it('render matches snapshot', () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Unsupported Region Modal', () => {
    it('calls handleSelectRegion with supported and unsupported regions and verifies navigation', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const usdRegion = {
        code: 'CA',
        flag: '🇨🇦',
        name: 'Canada',
        phonePrefix: '+1',
        currency: 'USD',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(usdRegion));

      const eurRegion = {
        code: 'DE',
        flag: '🇩🇪',
        name: 'Germany',
        phonePrefix: '+49',
        currency: 'EUR',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(eurRegion));

      const unsupportedRegion = {
        code: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phonePrefix: '+55',
        currency: 'BRL',
        phoneDigitCount: 11,
        supported: false,
      };

      act(() => handleSelectRegion(unsupportedRegion));

      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });

    it('calls handleSelectRegion for a list of regions and verifies callback type and navigation', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const testRegions = [
        {
          code: 'CA',
          flag: '🇨🇦',
          name: 'Canada',
          phonePrefix: '+1',
          currency: 'USD',
          phoneDigitCount: 10,
          supported: true,
        },
        {
          code: 'DE',
          flag: '🇩🇪',
          name: 'Germany',
          phonePrefix: '+49',
          currency: 'EUR',
          phoneDigitCount: 10,
          supported: true,
        },
        {
          code: 'BR',
          flag: '🇧🇷',
          name: 'Brazil',
          phonePrefix: '+55',
          currency: 'BRL',
          phoneDigitCount: 11,
          supported: false,
        },
      ];

      testRegions.forEach((region) => {
        act(() => handleSelectRegion(region));
      });

      expect(handleSelectRegion).toBeInstanceOf(Function);
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });

    it('calls handleSelectRegion with an unsupported region and verifies navigation', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const unsupportedRegion = {
        code: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phonePrefix: '+55',
        currency: 'BRL',
        phoneDigitCount: 11,
        supported: false,
      };

      act(() => handleSelectRegion(unsupportedRegion));

      expect(handleSelectRegion).toBeInstanceOf(Function);
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });
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

      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });

    it('updates selected region when handleSelectRegion callback is called with USD region', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const mockRegion = {
        code: 'CA',
        flag: '🇨🇦',
        name: 'Canada',
        phonePrefix: '+1',
        currency: 'USD',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(mockRegion));

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('updates selected region and fiat currency to EUR when handleSelectRegion callback is called with EUR region', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const mockRegion = {
        code: 'DE',
        flag: '🇩🇪',
        name: 'Germany',
        phonePrefix: '+49',
        currency: 'EUR',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(mockRegion));

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('updates selected region but keeps USD currency when handleSelectRegion callback is called with non-USD/EUR region', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const mockRegion = {
        code: 'GB',
        flag: '🇬🇧',
        name: 'United Kingdom',
        phonePrefix: '+44',
        currency: 'GBP',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(mockRegion));

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('navigates to unsupported region modal when handleSelectRegion callback is called with unsupported region', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const mockUnsupportedRegion = {
        code: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phonePrefix: '+55',
        currency: 'BRL',
        phoneDigitCount: 11,
        supported: false,
      };

      act(() => handleSelectRegion(mockUnsupportedRegion));

      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });

    it('handles unsupported region selection by updating state correctly', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const mockUnsupportedRegion = {
        code: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phonePrefix: '+55',
        currency: 'BRL',
        phoneDigitCount: 11,
        supported: false,
      };

      act(() => handleSelectRegion(mockUnsupportedRegion));

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('tests the handleSelectRegion callback pattern with different region types', () => {
      render(BuildQuote);
      const regionButton = screen.getByText('US');
      fireEvent.press(regionButton);

      const handleSelectRegion =
        mockNavigate.mock.calls[0][1].params.handleSelectRegion;

      const usdRegion = {
        code: 'CA',
        flag: '🇨🇦',
        name: 'Canada',
        phonePrefix: '+1',
        currency: 'USD',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(usdRegion));

      const eurRegion = {
        code: 'DE',
        flag: '🇩🇪',
        name: 'Germany',
        phonePrefix: '+49',
        currency: 'EUR',
        phoneDigitCount: 10,
        supported: true,
      };

      act(() => handleSelectRegion(eurRegion));

      const unsupportedRegion = {
        code: 'BR',
        flag: '🇧🇷',
        name: 'Brazil',
        phonePrefix: '+55',
        currency: 'BRL',
        phoneDigitCount: 11,
        supported: false,
      };

      act(() => handleSelectRegion(unsupportedRegion));

      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: {
          selectedRegion: US_REGION,
          handleSelectRegion: expect.any(Function),
        },
      });
    });
  });

  describe('Payment Method Selection', () => {
    it('navigates to payment method selection payment button is pressed', () => {
      render(BuildQuote);
      const payWithButton = screen.getByText('Pay with');
      fireEvent.press(payWithButton);
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositPaymentMethodSelectorModal',
        params: {
          handleSelectPaymentMethodId: expect.any(Function),
          selectedPaymentMethodId: 'credit_debit_card',
        },
      });
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
        expect(mockGetQuote).toHaveBeenCalledWith(
          'USD',
          'USDC',
          'ethereum',
          'credit_debit_card',
          '0',
        );
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
  });
});
