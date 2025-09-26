import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import Routes from '../../../../../../constants/navigation/Routes';
import { renderScreen } from '../../../../../../util/test/renderWithProvider';
import { backgroundState } from '../../../../../../util/test/initial-root-state';

import { BuyQuote } from '@consensys/native-ramps-sdk';
import { trace, endTrace } from '../../../../../../util/trace';
import { useRegions } from '../../hooks/useRegions';
import { useCryptoCurrencies } from '../../hooks/useCryptoCurrencies';
import { usePaymentMethods } from '../../hooks/usePaymentMethods';
import {
  createMockSDKReturn,
  MOCK_USE_REGIONS_ERROR,
  MOCK_USE_CRYPTOCURRENCIES_ERROR,
  MOCK_USE_PAYMENT_METHODS_ERROR,
  MOCK_USE_REGIONS_EMPTY,
  MOCK_USE_CRYPTOCURRENCIES_EMPTY,
  MOCK_USE_PAYMENT_METHODS_EMPTY,
  createMockSDKMethods,
  createMockNavigation,
  MOCK_REGIONS,
  MOCK_US_REGION,
  MOCK_EUR_REGION,
  MOCK_USDC_TOKEN,
  MOCK_CREDIT_DEBIT_CARD,
  MOCK_USE_REGIONS_RETURN,
  MOCK_USE_CRYPTOCURRENCIES_RETURN,
  MOCK_USE_PAYMENT_METHODS_RETURN,
  MOCK_CRYPTOCURRENCIES,
  MOCK_PAYMENT_METHODS,
} from '../../testUtils';

const createMockInteractionManager = () => ({
  runAfterInteractions: jest.fn((callback) => callback()),
});

const { InteractionManager } = jest.requireActual('react-native');

InteractionManager.runAfterInteractions = jest.fn(async (callback) =>
  callback(),
);

const mockInteractionManager = createMockInteractionManager();

const { mockNavigate, mockGoBack, mockSetNavigationOptions, mockSetParams } =
  createMockNavigation();

const {
  mockGetQuote,
  mockRouteAfterAuthentication,
  mockNavigateToVerifyIdentity,
  mockTrackEvent,
} = createMockSDKMethods();

const mockUseDepositSDK = jest.fn();
const mockUseDepositTokenExchange = jest.fn();
const mockUseAccountTokenCompatible = jest.fn();
const mockUseRoute = jest.fn().mockReturnValue({ params: {} });

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

jest.mock('../../hooks/usePaymentMethods', () => ({
  usePaymentMethods: jest.fn(),
}));

jest.mock('../../hooks/useRegions', () => ({
  useRegions: jest.fn(),
}));

jest.mock('../../hooks/useCryptoCurrencies', () => ({
  useCryptoCurrencies: jest.fn(),
}));

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
    const mockSDK = createMockSDKReturn();

    mockUseDepositSDK.mockReturnValue(mockSDK);
    mockUseDepositTokenExchange.mockReturnValue({
      tokenAmount: '0.00',
    });
    mockUseAccountTokenCompatible.mockReturnValue(true);
    mockUseRoute.mockReturnValue({ params: {} });

    jest.mocked(useRegions).mockReturnValue(MOCK_USE_REGIONS_RETURN);
    jest
      .mocked(useCryptoCurrencies)
      .mockReturnValue(MOCK_USE_CRYPTOCURRENCIES_RETURN);
    jest
      .mocked(usePaymentMethods)
      .mockReturnValue(MOCK_USE_PAYMENT_METHODS_RETURN);

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
        params: {
          regions: MOCK_REGIONS,
        },
      });
    });

    it('displays EUR currency when selectedRegion is EUR', () => {
      mockUseDepositSDK.mockReturnValue(
        createMockSDKReturn({
          selectedRegion: MOCK_EUR_REGION,
          fiatCurrency: {
            id: 'EUR',
            name: 'Euro',
            symbol: '€',
            emoji: '🇪🇺',
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
            ...MOCK_US_REGION,
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

    it('does not open region modal when regions error occurs', () => {
      jest.mocked(useRegions).mockReturnValue(MOCK_USE_REGIONS_ERROR);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: expect.any(Object),
      });
    });

    it('does not open region modal when regions array is empty', () => {
      jest.mocked(useRegions).mockReturnValue(MOCK_USE_REGIONS_EMPTY);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositRegionSelectorModal',
        params: expect.any(Object),
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
          paymentMethods: MOCK_PAYMENT_METHODS,
        },
      });
    });

    it('does not open payment method modal when payment methods error occurs', () => {
      jest
        .mocked(usePaymentMethods)
        .mockReturnValue(MOCK_USE_PAYMENT_METHODS_ERROR);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositPaymentMethodSelectorModal',
        params: expect.any(Object),
      });
    });

    it('does not open payment method modal when payment methods array is empty', () => {
      jest
        .mocked(usePaymentMethods)
        .mockReturnValue(MOCK_USE_PAYMENT_METHODS_EMPTY);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositPaymentMethodSelectorModal',
        params: expect.any(Object),
      });
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
          cryptoCurrencies: MOCK_CRYPTOCURRENCIES,
        },
      });
    });

    it('does not open token modal when crypto currencies error occurs', () => {
      jest
        .mocked(useCryptoCurrencies)
        .mockReturnValue(MOCK_USE_CRYPTOCURRENCIES_ERROR);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositTokenSelectorModal',
        params: expect.any(Object),
      });
    });

    it('does not open token modal when crypto currencies array is empty', () => {
      jest
        .mocked(useCryptoCurrencies)
        .mockReturnValue(MOCK_USE_CRYPTOCURRENCIES_EMPTY);

      render(BuildQuote);

      expect(screen.toJSON()).toMatchSnapshot();

      expect(mockNavigate).not.toHaveBeenCalledWith('DepositModals', {
        screen: 'DepositTokenSelectorModal',
        params: expect.any(Object),
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
        expect(mockGetQuote).toHaveBeenCalled();
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
          payment_method_id: MOCK_CREDIT_DEBIT_CARD.id,
          region: MOCK_US_REGION.isoCode,
          chain_id: MOCK_USDC_TOKEN.chainId,
          currency_destination: MOCK_USDC_TOKEN.assetId,
          currency_source: MOCK_US_REGION.currency,
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
          payment_method_id: MOCK_CREDIT_DEBIT_CARD.id,
          region: MOCK_US_REGION.isoCode,
          chain_id: MOCK_USDC_TOKEN.chainId,
          currency_destination: MOCK_USDC_TOKEN.assetId,
          currency_source: MOCK_US_REGION.currency,
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
          payment_method_id: MOCK_CREDIT_DEBIT_CARD.id,
          region: MOCK_US_REGION.isoCode,
          chain_id: MOCK_USDC_TOKEN.chainId,
          currency_destination: MOCK_USDC_TOKEN.assetId,
          currency_source: MOCK_US_REGION.currency,
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
          payment_method_id: MOCK_CREDIT_DEBIT_CARD.id,
          region: MOCK_US_REGION.isoCode,
          chain_id: MOCK_USDC_TOKEN.chainId,
          currency_destination: MOCK_USDC_TOKEN.assetId,
          currency_source: MOCK_US_REGION.currency,
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
          payment_method_id: MOCK_CREDIT_DEBIT_CARD.id,
          region: MOCK_US_REGION.isoCode,
          chain_id: MOCK_USDC_TOKEN.chainId,
          currency_destination: MOCK_USDC_TOKEN.assetId,
          currency_source: MOCK_US_REGION.currency,
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
        expect(mockGetQuote).toHaveBeenCalled();
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
            currency: MOCK_USDC_TOKEN.symbol,
            paymentMethod: MOCK_CREDIT_DEBIT_CARD.id,
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
