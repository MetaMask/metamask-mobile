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
    it('navigates to payment method selection when payment button is pressed', () => {
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
      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('EnterEmail', {
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

    it('displays error when quote is falsy', async () => {
      mockUseDepositSDK.mockReturnValue({ isAuthenticated: false });
      mockGetQuote.mockReturnValue(null);

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
  });
});
