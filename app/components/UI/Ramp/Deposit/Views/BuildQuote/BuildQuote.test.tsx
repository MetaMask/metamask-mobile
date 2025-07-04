import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

import { BuyQuote } from '@consensys/native-ramps-sdk';

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockInteractionManager = {
  runAfterInteractions: jest.fn((callback) => callback()),
};


const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockGetQuote = jest.fn();
const mockRouteAfterAuthentication = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();
const mockCreateReservation = jest.fn();
const mockCreateOrder = jest.fn();
const mockHandleNewOrder = jest.fn();

const createMockSDKReturn = (overrides = {}) => ({
  isAuthenticated: false,
  selectedWalletAddress: '0x123',
  selectedRegion: {
    isoCode: 'US',
    flag: '🇺🇸',
    name: 'United States',
    currency: 'USD',
    supported: true,
  },
  setSelectedRegion: jest.fn(),
  ...overrides,
});

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
    useFocusEffect: jest.fn().mockImplementation((callback) => callback()),
  };
});

jest.mock('../../sdk', () => ({
  useDepositSDK: () => mockUseDepositSDK(),
}));

jest.mock('../../hooks/useDepositSdkMethod', () => ({
  useDepositSdkMethod: jest.fn().mockImplementation((config) => {
    if (config?.method === 'getBuyQuote' || config === 'getBuyQuote') {
      return [{ error: null }, mockGetQuote];
    }
    return [{ error: null }, jest.fn()];
  }),
}));

jest.mock('../../hooks/useDepositTokenExchange', () =>
  jest.fn(() => mockUseDepositTokenExchange()),
);

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
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

jest.mock('../../hooks/useHandleNewOrder', () =>
  jest.fn(() => mockHandleNewOrder()),
);


jest.mock('react-native', () => {
  const actualReactNative = jest.requireActual('react-native');
  return {
    ...actualReactNative,
    InteractionManager: mockInteractionManager,
  };
});

function render(Component: React.ComponentType) {
  return renderScreen(
    Component,
    {
      name: Routes.DEPOSIT.BUILD_QUOTE,
    },
    {
      state: {
        engine: {
          backgroundState,
        },
      },
    },
  );
}

describe('BuildQuote Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
    mockUseDepositTokenExchange.mockReturnValue({
      tokenAmount: '0.00',
    });
    mockHandleNewOrder.mockResolvedValue(undefined);
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

      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
      });
    });

    it('displays EUR currency when selectedRegion is EUR', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: {
            isoCode: 'DE',
            flag: '🇩🇪',
            name: 'Germany',
            currency: 'EUR',
            supported: true,
          },
        }),
      );

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();
    });

    it('navigates to unsupported region modal when selectedRegion is not supported', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: {
            isoCode: 'XX',
            flag: '🏳️',
            name: 'Unsupported Region',
            currency: 'XXX',
            supported: false,
          },
        }),
      );

      render(BuildQuote);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
          screen: 'DepositUnsupportedRegionModal',
        });
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

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);

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

    it('navigates to EnterEmail when user is not authenticated', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
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

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('ProviderWebview', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to KycProcessing when user is authenticated, no forms required, but KYC not approved', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'PENDING' } } };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockFetchUserDetails).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('KycProcessing', {
          quote: {
            id: 'test-quote',
          },
        });
      });
    });

    it('navigates to BasicInfo when personalDetails form is required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = {
        forms: [{ id: 'personalDetails' }, { id: 'idProof' }],
      };
      const mockIdProofData = { data: { kycUrl: 'test-kyc-url' } };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
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
        expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
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

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
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
        expect(mockNavigate).toHaveBeenCalledWith('BasicInfo', {
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

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchKycFormData.mockResolvedValue(mockIdProofData);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('ENTER_EMAIL', {
          quote: mockQuote,
          paymentMethodId: 'credit_debit_card',
          cryptoCurrencyChainId: 'eip155:1',
        });
      });
    });

    it('calls routeAfterAuthentication when user is authenticated', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockRouteAfterAuthentication).toHaveBeenCalledWith(mockQuote);
      });
    });

    it('displays error when quote fetch fails', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockRejectedValue(new Error('Failed to fetch quote'));

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('displays error when routeAfterAuthentication throws', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockRouteAfterAuthentication.mockRejectedValue(
        new Error('Routing failed'),
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

    it('renders success state snapshot when quote is fetched successfully', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('navigates to BankDetails when user is authenticated, no forms required, KYC approved, and SEPA payment method is selected', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'APPROVED' } } };
      const mockReservation = { id: 'reservation-123' };
      const mockOrder = { id: 'order-123', walletAddress: 'wallet-address' };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedWalletAddress: 'selected-wallet',
        }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);

      render(BuildQuote);

      const payWithButton = screen.getByText('Pay with');
      fireEvent.press(payWithButton);

      const handleSelectPaymentMethodId =
        mockNavigate.mock.calls[0][1].params.handleSelectPaymentMethodId;
      act(() => handleSelectPaymentMethodId('sepa_bank_transfer'));

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockCreateReservation).toHaveBeenCalledWith(
          mockQuote,
          'selected-wallet',
        );
        expect(mockCreateOrder).toHaveBeenCalledWith(mockReservation);
        expect(mockHandleNewOrder).toHaveBeenCalled();
      });
    });

    it('shows error when SEPA reservation fails', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'APPROVED' } } };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedWalletAddress: 'selected-wallet',
        }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockCreateReservation.mockResolvedValue(null);

      render(BuildQuote);

      const payWithButton = screen.getByText('Pay with');
      fireEvent.press(payWithButton);

      const handleSelectPaymentMethodId =
        mockNavigate.mock.calls[0][1].params.handleSelectPaymentMethodId;
      act(() => handleSelectPaymentMethodId('sepa_bank_transfer'));

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(screen.toJSON()).toMatchSnapshot();
      });
    });

    it('shows error when SEPA order creation fails', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };
      const mockUserDetails = { kyc: { l1: { status: 'APPROVED' } } };
      const mockReservation = { id: 'reservation-123' };

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          isAuthenticated: true,
          selectedWalletAddress: 'selected-wallet',
        }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);
      mockFetchUserDetails.mockResolvedValue(mockUserDetails);
      mockCreateReservation.mockResolvedValue(mockReservation);
      mockCreateOrder.mockResolvedValue(null);

      render(BuildQuote);

      const payWithButton = screen.getByText('Pay with');
      fireEvent.press(payWithButton);

      const handleSelectPaymentMethodId =
        mockNavigate.mock.calls[0][1].params.handleSelectPaymentMethodId;
      act(() => handleSelectPaymentMethodId('sepa_bank_transfer'));

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
