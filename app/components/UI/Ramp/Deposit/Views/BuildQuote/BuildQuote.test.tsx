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
const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();

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
    return [null, jest.fn()];
  }),
}));

jest.mock('../../hooks/useDepositTokenExchange', () => ({
  __esModule: true,
  default: () => mockUseDepositTokenExchange(),
}));

jest.mock('../../../../../hooks/useStyles', () => ({
  useStyles: () => ({
    styles: {
      inputContainer: {},
      detailsContainer: {},
      sectionTitle: {},
      detailRow: {},
      content: {},
      selectionRow: {},
      fiatSelector: {},
      centerGroup: {},
      mainAmount: {},
      convertedAmount: {},
      cryptoPill: {},
      tokenLogo: {},
      cryptoText: {},
      paymentMethodBox: {},
      paymentMethodContent: {},
      keypad: {},
    },
    theme: {
      colors: {
        icon: {
          alternative: '#000',
        },
      },
    },
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

jest.mock('../../components/DepositTextField', () => 'DepositTextField');
jest.mock('../../components/AccountSelector', () => 'AccountSelector');

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
  });

  it('render matches snapshot', () => {
    render(BuildQuote);
    expect(screen.toJSON()).toMatchSnapshot();
  });

  describe('Currency Selection', () => {
    it('switches between USD and EUR when fiat currency is pressed', () => {
      render(BuildQuote);

      const fiatSelector = screen.getByText('USD');
      fireEvent.press(fiatSelector);

      expect(screen.getByText('EUR')).toBeTruthy();

      fireEvent.press(screen.getByText('EUR'));
      expect(screen.getByText('USD')).toBeTruthy();
    });

    it('switches between USDC and USDT when crypto currency is pressed', () => {
      render(BuildQuote);

      const cryptoSelector = screen.getByText('USDC');
      fireEvent.press(cryptoSelector);

      expect(screen.getByText('USDT')).toBeTruthy();

      fireEvent.press(screen.getByText('USDT'));
      expect(screen.getByText('USDC')).toBeTruthy();
    });
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
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          'eip155:1',
          'credit_debit_card',
          '0',
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

    it('navigates to provider webview when user is authenticated and no forms required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('PROVIDER_WEBVIEW', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to basic info when user is authenticated and forms required', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: ['form1'] };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('BASIC_INFO', {
          quote: mockQuote,
        });
      });
    });

    it('navigates to enter email when user is not authenticated', async () => {
      const mockQuote = { id: 'test-quote' };
      const mockForms = { forms: [] };

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);
      mockFetchKycForms.mockResolvedValue(mockForms);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('ENTER_EMAIL', {
          quote: mockQuote,
        });
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
  });
});
