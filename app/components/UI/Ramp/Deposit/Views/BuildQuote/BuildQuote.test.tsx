import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import renderDepositTestComponent from '../../utils/renderDepositTestComponent';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetNavigationOptions = jest.fn();
const mockGetQuote = jest.fn();
const mockFetchKycForms = jest.fn();
const mockFetchKycFormData = jest.fn();
const mockFetchUserDetails = jest.fn();
const mockUseDepositSDK = jest.fn();

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
      return [null, mockGetQuote];
    }
    if (config?.method === 'getKYCForms') {
      return [null, mockFetchKycForms];
    }
    if (config?.method === 'getKycForm') {
      return [null, mockFetchKycFormData];
    }
    if (config?.method === 'getUserDetails') {
      return [null, mockFetchUserDetails];
    }
    return [null, jest.fn()];
  }),
}));

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      inputContainer: {},
      detailsContainer: {},
      sectionTitle: {},
      detailRow: {},
    },
    theme: {},
  }),
}));

jest.mock('./BuildQuote.styles', () => ({}));

jest.mock('../ProviderWebview/ProviderWebview', () => ({
  createProviderWebviewNavDetails: jest.fn(() => ['PROVIDER_WEBVIEW', {}]),
}));

jest.mock('../BasicInfo/BasicInfo', () => ({
  createBasicInfoNavDetails: jest.fn(() => ['BASIC_INFO', {}]),
}));

jest.mock('../EnterEmail/EnterEmail', () => ({
  createEnterEmailNavDetails: jest.fn(() => ['ENTER_EMAIL', {}]),
}));

jest.mock('../KycWebview/KycWebview', () => ({
  createKycWebviewNavDetails: jest.fn(() => ['KYC_WEBVIEW', {}]),
}));

jest.mock('../KycProcessing/KycProcessing', () => ({
  createKycProcessingNavDetails: jest.fn(() => ['KYC_PROCESSING', {}]),
}));

jest.mock('../../components/DepositTextField', () => 'DepositTextField');

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
  });

  it('render matches snapshot', () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Continue button functionality', () => {
    it('calls getQuote with correct parameters', async () => {
      const mockQuote = { id: 'test-quote' };
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
          '100',
        );
      });
    });

    it('calls fetchKycForms with the quote when getQuote succeeds', async () => {
      const mockQuote = { id: 'test-quote' };
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

    it('navigates when user is not authenticated', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('navigates when user is authenticated', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalled();
      });
    });

    it('does not navigate when getQuote fails', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(null);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockGetQuote).toHaveBeenCalled();
        expect(mockNavigate).not.toHaveBeenCalled();
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
        expect(mockNavigate).toHaveBeenCalledWith('PROVIDER_WEBVIEW', {});
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
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {});
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
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {});
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
        expect(mockNavigate).toHaveBeenCalledWith('KYC_WEBVIEW', {});
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
        // Should not navigate when idProofData is null
        expect(mockNavigate).not.toHaveBeenCalled();
      });
    });
  });
});
