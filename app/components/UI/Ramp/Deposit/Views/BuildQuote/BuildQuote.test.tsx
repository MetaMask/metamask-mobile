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
const mockRouteAfterAuthentication = jest.fn();
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
    return [{ error: null }, jest.fn()];
  }),
}));

jest.mock('../../hooks/useDepositTokenExchange', () => ({
  __esModule: true,
  default: () => mockUseDepositTokenExchange(),
}));

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
  })),
}));

jest.mock('../EnterEmail/EnterEmail', () => ({
  createEnterEmailNavDetails: jest.fn(
    ({ quote, cryptoCurrencyChainId, paymentMethodId }) => [
      'ENTER_EMAIL',
      {
        quote,
        cryptoCurrencyChainId,
        paymentMethodId,
      },
    ],
  ),
}));

jest.mock('../Modals/UnsupportedRegionModal', () => ({
  createUnsupportedRegionModalNavigationDetails:
    mockCreateUnsupportedRegionModalNavigationDetails,
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
        regionName: 'Brazil',
        onExitToWalletHome: expect.any(Function),
        onSelectDifferentRegion: expect.any(Function),
      },
    ]);
    mockRouteAfterAuthentication.mockResolvedValue(undefined);
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
          selectedRegionCode: 'US',
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
          selectedRegionCode: 'US',
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
          selectedRegionCode: 'US',
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
          selectedRegionCode: 'US',
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
          selectedRegionCode: 'US',
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
          selectedRegionCode: 'US',
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

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
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

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockResolvedValue(mockQuote);

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

      mockUseDepositSDK.mockReturnValue({ isAuthenticated: true });
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

      mockGetQuote.mockResolvedValue(mockQuote);

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
