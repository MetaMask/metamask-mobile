import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

import { BuyQuote } from '@consensys/native-ramps-sdk';
import {
  DEBIT_CREDIT_PAYMENT_METHOD,
  WIRE_TRANSFER_PAYMENT_METHOD,
} from '../../constants';
import { trace, endTrace } from '../../../../../../util/trace';

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
const mockSetParams = jest.fn();
const mockGetQuote = jest.fn();
const mockRouteAfterAuthentication = jest.fn();
const mockNavigateToVerifyIdentity = jest.fn();
const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();
const mockUseAccountTokenCompatible = jest.fn();
const mockTrackEvent = jest.fn();
const mockRequestOtt = jest.fn();
const mockUseRoute = jest.fn().mockReturnValue({ params: {} });

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
      setParams: mockSetParams,
    }),
    useFocusEffect: jest.fn().mockImplementation((callback) => callback()),
    useRoute: () => mockUseRoute(),
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
    if (config?.method === 'requestOtt') {
      return [{ error: null }, mockRequestOtt];
    }
    return [{ error: null }, jest.fn()];
  }),
}));

jest.mock(
  '../../hooks/useDepositTokenExchange',
  () => () => mockUseDepositTokenExchange(),
);

jest.mock(
  '../../hooks/useAccountTokenCompatible',
  () => () => mockUseAccountTokenCompatible(),
);

jest.mock('../../hooks/useDepositRouting', () => ({
  useDepositRouting: jest.fn(() => ({
    routeAfterAuthentication: mockRouteAfterAuthentication,
    navigateToVerifyIdentity: mockNavigateToVerifyIdentity,
  })),
}));

const mockUsePaymentMethods = jest
  .fn()
  .mockReturnValue([DEBIT_CREDIT_PAYMENT_METHOD, WIRE_TRANSFER_PAYMENT_METHOD]);
jest.mock('../../hooks/usePaymentMethods', () => () => mockUsePaymentMethods());

// Mock the analytics hook like in the aggregator test
jest.mock('../../../hooks/useAnalytics', () => () => mockTrackEvent);

jest.mock('../../../../../../util/trace', () => ({
  ...jest.requireActual('../../../../../../util/trace'),
  trace: jest.fn(),
  endTrace: jest.fn(),
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
    mockUseAccountTokenCompatible.mockReturnValue(true);
    mockUseRoute.mockReturnValue({ params: {} });
    mockTrackEvent.mockClear();
    (trace as jest.MockedFunction<typeof trace>).mockClear();
    (endTrace as jest.MockedFunction<typeof endTrace>).mockClear();
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

    it('tracks RAMPS_PAYMENT_METHOD_SELECTED event when payment method is selected', () => {
      render(BuildQuote);
      const payWithButton = screen.getByText('Pay with');
      fireEvent.press(payWithButton);

      act(() =>
        mockNavigate.mock.calls[0][1].params.handleSelectPaymentMethodId(
          'credit_debit_card',
        ),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith(
        'RAMPS_PAYMENT_METHOD_SELECTED',
        {
          ramp_type: 'DEPOSIT',
          region: 'US',
          payment_method_id: 'credit_debit_card',
          is_authenticated: false,
        },
      );
    });
  });

  describe('Token Selection', () => {
    it('navigates to token selection when token button is pressed', () => {
      render(BuildQuote);
      const tokenButton = screen.getByText('USDC');
      fireEvent.press(tokenButton);
      expect(mockNavigate).toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositTokenSelectorModal',
        params: {
          handleSelectAssetId: expect.any(Function),
          selectedAssetId:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        },
      });
    });

    it('tracks RAMPS_TOKEN_SELECTED event when token is selected', () => {
      render(BuildQuote);
      const tokenButton = screen.getByText('USDC');
      fireEvent.press(tokenButton);

      act(() =>
        mockNavigate.mock.calls[0][1].params.handleSelectAssetId(
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        ),
      );

      expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_TOKEN_SELECTED', {
        ramp_type: 'DEPOSIT',
        region: 'US',
        chain_id: 'eip155:1',
        currency_destination:
          'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        currency_source: 'USD',
        is_authenticated: false,
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

    it('tracks RAMPS_ORDER_PROPOSED event when continue is pressed', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ORDER_PROPOSED', {
          ramp_type: 'DEPOSIT',
          amount_source: 0,
          amount_destination: 0,
          payment_method_id: 'credit_debit_card',
          region: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
          is_authenticated: false,
        });
      });
    });

    it('calls navigateToVerifyIdentity when user is not authenticated', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);
      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigateToVerifyIdentity).toHaveBeenCalledWith({
          quote: mockQuote,
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

    it('navigates to incompatible token modal when user they are not compatible', async () => {
      mockUseAccountTokenCompatible.mockReturnValue(false);
      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith(
          'DepositModals',
          expect.objectContaining({
            screen: 'IncompatibleAccountTokenModal',
          }),
        );
      });
    });

    it('tracks RAMPS_ORDER_SELECTED event when user is authenticated and quote is successful', async () => {
      const mockQuote = {
        quoteId: 'test-quote',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        conversionPrice: 2000,
        feeBreakdown: [
          { type: 'network_fee', value: 0.01 },
          { type: 'transak_fee', value: 0.02 },
        ],
        totalFee: 0.03,
        paymentMethod: 'credit_debit_card',
        fiatCurrency: 'USD',
      } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
      mockGetQuote.mockResolvedValue(mockQuote);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      fireEvent.press(continueButton);

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ORDER_SELECTED', {
          ramp_type: 'DEPOSIT',
          amount_source: 100,
          amount_destination: 0.05,
          exchange_rate: 2000,
          gas_fee: 0.01,
          processing_fee: 0.02,
          total_fee: 0.03,
          payment_method_id: 'credit_debit_card',
          region: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
        });
      });
    });

    it('displays error when quote fetch fails', async () => {
      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
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

    it('tracks RAMPS_ORDER_FAILED event when quote fetch fails', async () => {
      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockRejectedValue(new Error('Failed to fetch quote'));

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ORDER_FAILED', {
          ramp_type: 'DEPOSIT',
          amount_source: 0,
          amount_destination: 0,
          payment_method_id: 'credit_debit_card',
          region: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
          error_message: 'BuildQuote - Error fetching quote',
          is_authenticated: false,
        });
      });
    });

    it('displays error when quote is falsy', async () => {
      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
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

    it('tracks RAMPS_ORDER_FAILED event when quote is falsy', async () => {
      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockReturnValue(null);

      render(BuildQuote);

      const continueButton = screen.getByText('Continue');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ORDER_FAILED', {
          ramp_type: 'DEPOSIT',
          amount_source: 0,
          amount_destination: 0,
          payment_method_id: 'credit_debit_card',
          region: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
          error_message: 'BuildQuote - Error fetching quote',
          is_authenticated: false,
        });
      });
    });

    it('displays error when routeAfterAuthentication throws', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
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

    it('tracks RAMPS_ORDER_FAILED event when routeAfterAuthentication throws', async () => {
      const mockQuote = {
        quoteId: 'test-quote',
        fiatAmount: 100,
        cryptoAmount: 0.05,
        paymentMethod: 'credit_debit_card',
        fiatCurrency: 'USD',
      } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );
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
        expect(mockTrackEvent).toHaveBeenCalledWith('RAMPS_ORDER_FAILED', {
          ramp_type: 'DEPOSIT',
          amount_source: 100,
          amount_destination: 0.05,
          payment_method_id: 'credit_debit_card',
          region: 'US',
          chain_id: 'eip155:1',
          currency_destination:
            'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
          currency_source: 'USD',
          error_message: 'BuildQuote - Error handling authentication',
          is_authenticated: true,
        });
      });
    });
    it('calls handleOnPressContinue when shouldRouteImmediately is true', async () => {
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);

      mockUseRoute.mockReturnValue({
        params: { shouldRouteImmediately: true },
      });

      render(BuildQuote);

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
  });

  describe('OTT Token Management', () => {
    beforeEach(() => {
      mockRequestOtt.mockClear();
    });

    it('fetches OTT token with timestamp when user becomes authenticated', async () => {
      const mockOttToken = { ott: 'test-ott-token' };
      mockRequestOtt.mockResolvedValue(mockOttToken);

      const mockTimestamp = 1640995200000;
      jest.spyOn(Date, 'now').mockReturnValue(mockTimestamp);

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );

      mockUseRoute.mockReturnValue({
        params: {},
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockRequestOtt).toHaveBeenCalledTimes(1);
      });

      jest.restoreAllMocks();
    });

    it('does not fetch OTT token when user is unauthenticated', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: false }),
      );

      mockUseRoute.mockReturnValue({
        params: {},
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockRequestOtt).not.toHaveBeenCalled();
      });
    });

    it('handles OTT token state changes correctly', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );

      mockUseRoute.mockReturnValue({
        params: {},
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockRequestOtt).toHaveBeenCalledTimes(1);
      });
    });

    it('does not fetch OTT token when shouldRouteImmediately is true', async () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );

      mockUseRoute.mockReturnValue({
        params: { shouldRouteImmediately: true },
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockRequestOtt).not.toHaveBeenCalled();
      });
    });

    it('fetches OTT token when shouldRouteImmediately is false and user is authenticated', async () => {
      const mockOttToken = { ott: 'test-ott-token' };
      mockRequestOtt.mockResolvedValue(mockOttToken);

      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({ isAuthenticated: true }),
      );

      mockUseRoute.mockReturnValue({
        params: { shouldRouteImmediately: false },
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockRequestOtt).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Tracing functionality', () => {
    beforeEach(() => {
      const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
      const mockTrace = trace as jest.MockedFunction<typeof trace>;
      mockEndTrace.mockClear();
      mockTrace.mockClear();
    });

    it('should call endTrace for LoadDepositExperience when component mounts', () => {
      const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;

      render(BuildQuote);

      expect(mockEndTrace).toHaveBeenCalledWith({
        name: 'Load Deposit Experience',
        data: {
          destination: 'BuildQuote',
        },
      });
    });

    it('should call trace for DepositContinueFlow when continue is pressed normally', async () => {
      const mockTrace = trace as jest.MockedFunction<typeof trace>;
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);

      render(BuildQuote);

      await act(async () => {
        const continueButton = screen.getByText('Continue');
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: 'Deposit Continue Flow',
          tags: {
            amount: 0,
            currency: 'USDC',
            paymentMethod: 'credit_debit_card',
            authenticated: false,
          },
        });
      });
    });

    it('should NOT call trace for DepositContinueFlow when shouldRouteImmediately is true', async () => {
      const mockTrace = trace as jest.MockedFunction<typeof trace>;
      const mockQuote = { quoteId: 'test-quote' } as BuyQuote;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockResolvedValue(mockQuote);
      mockUseRoute.mockReturnValue({
        params: { shouldRouteImmediately: true },
      });

      render(BuildQuote);

      await waitFor(() => {
        expect(mockGetQuote).toHaveBeenCalled();
      });

      expect(mockTrace).not.toHaveBeenCalledWith({
        name: 'Deposit Continue Flow',
        tags: expect.any(Object),
      });
    });

    it('should call endTrace for DepositContinueFlow with error when quote fetch fails', async () => {
      const mockEndTrace = endTrace as jest.MockedFunction<typeof endTrace>;
      const mockTrace = trace as jest.MockedFunction<typeof trace>;

      mockUseDepositSDK.mockReturnValue(createMockSDKReturn());
      mockGetQuote.mockRejectedValue(new Error('Failed to fetch quote'));

      render(BuildQuote);

      await act(async () => {
        const continueButton = screen.getByText('Continue');
        fireEvent.press(continueButton);
      });

      await waitFor(() => {
        expect(mockTrace).toHaveBeenCalledWith({
          name: 'Deposit Continue Flow',
          tags: expect.any(Object),
        });
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: 'Deposit Continue Flow',
          data: {
            error: 'Failed to fetch quote',
          },
        });
      });
    });
  });
});
