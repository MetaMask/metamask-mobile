import React from 'react';
import { fireEvent, act, waitFor } from '@testing-library/react-native';
import BuildQuote, {
  createBuildQuoteNavDetails,
  isBailedOrderStatus,
} from './BuildQuote';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';
import { RampsOrderStatus } from '@metamask/ramps-controller';

jest.mock('../../../../Base/Keypad', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Button } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ onChange }: { onChange: (d: unknown) => void }) =>
      ReactActual.createElement(View, { testID: 'mock-keypad' }, [
        ReactActual.createElement(Button, {
          key: 'keypad',
          testID: 'keypad-trigger-string',
          title: 'Keypad',
          onPress: () =>
            onChange({
              value: '250',
              valueAsNumber: 250,
              pressedKey: '0',
            }),
        }),
        ReactActual.createElement(Button, {
          key: 'empty',
          testID: 'keypad-trigger-empty',
          title: 'Empty',
          onPress: () =>
            onChange({
              value: '',
              valueAsNumber: 0,
              pressedKey: '0',
            }),
        }),
        ReactActual.createElement(Button, {
          key: 'value',
          testID: 'keypad-trigger-with-value-as-number',
          title: 'WithValueAsNumber',
          onPress: () =>
            onChange({
              value: '99.99',
              valueAsNumber: 42,
              pressedKey: '0',
            }),
        }),
        ReactActual.createElement(Button, {
          key: 'back',
          testID: 'keypad-trigger-back',
          title: 'Back',
          onPress: () =>
            onChange({
              value: '10',
              valueAsNumber: 10,
              pressedKey: 'back',
            }),
        }),
      ]),
    Keys: { Back: 'back' },
  };
});

jest.mock('../../components/QuickAmounts', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Button } = jest.requireActual('react-native');
  return ({ onAmountPress }: { onAmountPress: (amount: number) => void }) =>
    ReactActual.createElement(
      View,
      { testID: 'mock-quick-amounts' },
      ReactActual.createElement(Button, {
        testID: 'quick-amount-50',
        title: '50',
        onPress: () => onAmountPress(50),
      }),
    );
});

jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
    useIsFocused: jest.fn(() => true),
    useFocusEffect: (callback: () => void | (() => void)) => {
      ReactActual.useEffect(() => {
        const cleanup = callback();
        return typeof cleanup === 'function' ? cleanup : undefined;
      }, [callback]);
    },
  };
});

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: jest.fn(),
  createNavigationDetails:
    (name: string, screen?: string) => (params?: object) => [
      name,
      screen ? { screen, params } : params,
    ],
}));

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: jest.fn(),
}));

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: jest.fn(),
}));

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: jest.fn(),
}));

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: jest.fn(),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: jest.fn(),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getRampRoutingDecision: () => 'AGGREGATOR',
  UnifiedRampRoutingType: { AGGREGATOR: 'AGGREGATOR' },
}));

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x1234567890123456789012345678901234567890',
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => (chainId: string) => ({
    networkName: chainId === 'eip155:1' ? 'Ethereum Mainnet' : 'Unknown',
    chainId,
  }),
}));

jest.mock('../../../../../util/device', () => {
  const mockIsAndroid = jest.fn();
  const mockIsIos = jest.fn(() => true);
  return {
    __esModule: true,
    default: {
      isAndroid: mockIsAndroid,
      isIos: mockIsIos,
    },
    isAndroid: mockIsAndroid,
    isIos: mockIsIos,
  };
});

jest.mock('react-native-inappbrowser-reborn', () => ({
  openAuth: jest.fn(),
  closeAuth: jest.fn(),
  isAvailable: jest.fn(),
}));

jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({ styles: {} }),
}));

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (value: number) => `$${value.toFixed(2)}`,
  }),
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: jest.fn((value: number) => value),
}));

jest.mock('../../hooks/useBlinkingCursor', () => ({
  useBlinkingCursor: () => 1,
}));

const mockUseRampsController = jest.requireMock(
  '../../hooks/useRampsController',
).useRampsController as jest.Mock;

const mockUseRampsQuotes = jest.requireMock('../../hooks/useRampsQuotes')
  .useRampsQuotes as jest.Mock;

const mockUseTransakController = jest.requireMock(
  '../../hooks/useTransakController',
).useTransakController as jest.Mock;

const mockUseTransakRouting = jest.requireMock('../../hooks/useTransakRouting')
  .useTransakRouting as jest.Mock;

const mockUseParams = jest.requireMock(
  '../../../../../util/navigation/navUtils',
).useParams as jest.Mock;

const mockUseAnalytics = jest.requireMock(
  '../../../../hooks/useAnalytics/useAnalytics',
).useAnalytics as jest.Mock;

const mockUseDebouncedValue = jest.requireMock(
  '../../../../hooks/useDebouncedValue',
).useDebouncedValue as jest.Mock;

const mockDeviceIsAndroid = jest.requireMock('../../../../../util/device')
  .isAndroid as jest.Mock;

const mockLinkingOpenURL = jest.requireMock(
  'react-native/Libraries/Linking/Linking',
).openURL as jest.Mock;

const mockInAppBrowser = jest.requireMock('react-native-inappbrowser-reborn');

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockAddProperties = jest.fn();
const mockBuild = jest.fn();
const mockNavigationReset = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockGetBuyWidgetData = jest.fn();
const mockAddOrder = jest.fn();
const mockGetOrderFromCallback = jest.fn();
const mockAddPrecreatedOrder = jest.fn();
const mockCheckExistingToken = jest.fn();
const mockGetBuyQuote = jest.fn();
const mockRouteAfterAuth = jest.fn();

const WIDGET_PROVIDER_QUOTE = {
  provider: 'moonpay',
  id: 'quote-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  quote: {
    buyWidget: { browser: 'IN_APP_OS_BROWSER' as const },
    buyURL: 'https://widget.example.com/checkout',
  },
};

const IN_APP_CHECKOUT_QUOTE = {
  provider: 'moonpay',
  id: 'quote-inapp-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  quote: {
    buyURL: 'https://widget.example.com/checkout',
  },
};

const WIDGET_PROVIDER = {
  id: 'moonpay',
  name: 'MoonPay',
  supportedCryptoCurrencies: { 'eip155:1/slip44:60': true },
  links: [],
};

const NATIVE_PROVIDER = {
  id: 'transak',
  name: 'Transak',
  supportedCryptoCurrencies: { 'eip155:1/slip44:60': true },
  links: [],
};

const NATIVE_PROVIDER_QUOTE = {
  provider: 'transak',
  id: 'quote-transak-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
  providerInfo: { type: 'native' as const, name: 'Transak', id: 'transak' },
};

const MOCK_TRANSAK_QUOTE = {
  id: 'transak-quote-1',
  fiatAmount: 100,
  fiatCurrency: 'USD',
  cryptoAmount: '0.05',
  cryptoCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
};

const SELECTED_TOKEN = {
  assetId: 'eip155:1/slip44:60',
  chainId: 'eip155:1',
  symbol: 'ETH',
};

const SELECTED_PAYMENT_METHOD = {
  id: '/payments/debit-credit-card',
  name: 'Debit/Credit Card',
  isManualBankTransfer: false,
  paymentType: 'debit-credit-card',
  icons: [] as const,
};

const USER_REGION = {
  country: {
    currency: 'USD',
    isoCode: 'US',
    defaultAmount: 100,
    quickAmounts: [50, 100, 200],
  },
  regionCode: 'us-ca',
};

const buildProviderWithLimits = (limits: {
  minAmount: number;
  maxAmount: number;
  feeFixedRate?: number;
  feeDynamicRate?: number;
}) => ({
  ...WIDGET_PROVIDER,
  limits: {
    fiat: {
      usd: {
        [SELECTED_PAYMENT_METHOD.id]: {
          feeFixedRate: 0,
          feeDynamicRate: 0,
          ...limits,
        },
      },
    },
  },
});

const defaultQuotesHookResult = (options?: unknown) =>
  options
    ? {
        data: { success: [WIDGET_PROVIDER_QUOTE] },
        loading: false,
        error: null,
      }
    : {
        data: null,
        loading: false,
        error: null,
      };

describe('isBailedOrderStatus', () => {
  it('returns true for Precreated, IdExpired, Unknown', () => {
    expect(isBailedOrderStatus(RampsOrderStatus.Precreated)).toBe(true);
    expect(isBailedOrderStatus(RampsOrderStatus.IdExpired)).toBe(true);
    expect(isBailedOrderStatus(RampsOrderStatus.Unknown)).toBe(true);
  });

  it('returns false for other statuses', () => {
    expect(isBailedOrderStatus(RampsOrderStatus.Pending)).toBe(false);
    expect(isBailedOrderStatus(RampsOrderStatus.Completed)).toBe(false);
  });

  it('returns false for null or undefined', () => {
    expect(isBailedOrderStatus(undefined)).toBe(false);
    expect(isBailedOrderStatus(null as unknown as RampsOrderStatus)).toBe(
      false,
    );
  });
});

describe('createBuildQuoteNavDetails', () => {
  it('returns token selection route with amount input screen', () => {
    const result = createBuildQuoteNavDetails();
    expect(result[0]).toBe(Routes.RAMP.TOKEN_SELECTION);
    expect(result[1].screen).toBe(Routes.RAMP.TOKEN_SELECTION);
    expect(result[1].params.screen).toBe(Routes.RAMP.AMOUNT_INPUT);
    expect(result[1].params.params).toBeUndefined();
  });

  it('passes params when provided', () => {
    const result = createBuildQuoteNavDetails({
      assetId: 'eip155:1/slip44:60',
      nativeFlowError: 'error',
    });
    expect(result[1].params.params).toEqual({
      assetId: 'eip155:1/slip44:60',
      nativeFlowError: 'error',
    });
  });
});

const mockSetSelectedProvider = jest.fn();

const buildRampsControllerResult = (overrides = {}) => ({
  userRegion: USER_REGION,
  providers: [WIDGET_PROVIDER, NATIVE_PROVIDER],
  selectedProvider: WIDGET_PROVIDER,
  setSelectedProvider: mockSetSelectedProvider,
  selectedToken: SELECTED_TOKEN,
  paymentMethods: [SELECTED_PAYMENT_METHOD],
  getBuyWidgetData: mockGetBuyWidgetData,
  addPrecreatedOrder: mockAddPrecreatedOrder,
  addOrder: mockAddOrder,
  getOrderFromCallback: mockGetOrderFromCallback,
  paymentMethodsLoading: false,
  paymentMethodsFetching: false,
  paymentMethodsStatus: 'success',
  selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
  ...overrides,
});

describe('BuildQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseRampsController.mockReturnValue(buildRampsControllerResult());
    mockUseDebouncedValue.mockImplementation((value: number) => value);
    mockUseRampsQuotes.mockImplementation((options) =>
      defaultQuotesHookResult(options),
    );
    mockUseTransakController.mockReturnValue({
      checkExistingToken: mockCheckExistingToken,
      getBuyQuote: mockGetBuyQuote,
    });
    mockUseTransakRouting.mockReturnValue({
      routeAfterAuthentication: mockRouteAfterAuth,
    });
    mockUseAnalytics.mockReturnValue({
      trackEvent: mockTrackEvent,
      createEventBuilder: mockCreateEventBuilder,
    });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
      build: mockBuild,
    });
    mockAddProperties.mockReturnValue({ build: mockBuild });

    (useNavigation as jest.Mock).mockReturnValue({
      reset: mockNavigationReset,
      setParams: jest.fn(),
      navigate: mockNavigate,
      goBack: mockGoBack,
    });
  });

  describe('amount param initialization', () => {
    it('uses DEFAULT_AMOUNT (100) when no amount param is provided', () => {
      mockUseParams.mockReturnValue({});

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('100');
    });

    it('uses amount param as initial value when provided via route params', () => {
      mockUseParams.mockReturnValue({ amount: 30 });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('30');
    });

    it('does not override amount with region default when amount param is provided', () => {
      mockUseParams.mockReturnValue({ amount: 50 });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('50');
    });
  });

  describe('navigateAfterExternalBrowser', () => {
    it('resets to BuildQuote when returnDestination is buildQuote (Android external browser path)', async () => {
      mockDeviceIsAndroid.mockReturnValue(true);
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/checkout',
        browser: 'IN_APP_OS_BROWSER',
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      await waitFor(() => {
        expect(mockLinkingOpenURL).toHaveBeenCalledWith(
          'https://widget.example.com/checkout',
        );
        expect(mockNavigationReset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.BUILD_QUOTE,
              params: {},
            },
          ],
        });
      });
    });

    it('resets to order details when returnDestination is order (InAppBrowser success path)', async () => {
      mockDeviceIsAndroid.mockReturnValue(false);
      mockInAppBrowser.isAvailable.mockResolvedValue(true);
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=ord-123',
      });
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://widget.example.com/checkout',
        browser: 'IN_APP_OS_BROWSER',
        orderId: 'ord-123',
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      await waitFor(() => {
        expect(mockAddOrder).not.toHaveBeenCalled();
        expect(mockGetOrderFromCallback).not.toHaveBeenCalled();
        expect(mockNavigationReset).toHaveBeenCalledWith({
          index: 0,
          routes: [
            {
              name: Routes.RAMP.RAMPS_ORDER_DETAILS,
              params: {
                callbackUrl:
                  'metamask://on-ramp/providers/moonpay?orderId=ord-123',
                providerCode: 'moonpay',
                walletAddress: '0x1234567890123456789012345678901234567890',
                showCloseButton: true,
              },
            },
          ],
        });
      });
    });
  });

  describe('updateAmount', () => {
    it('updates amount from string input (empty string maps to "0")', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-empty'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('0');
    });

    it('updates amount from string input with parsed valueAsNumber', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-string'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('250');
    });

    it('uses valueAsNumber when provided with string input', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-with-value-as-number'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('99.99');
    });

    it('updates amount from number input via QuickAmounts', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-empty'));
      });

      await act(async () => {
        fireEvent.press(getByTestId('quick-amount-50'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('50');
    });

    it('clears rampsError when amount is updated', async () => {
      mockUseParams.mockReturnValue({ nativeFlowError: 'Some error' });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });
      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-string'));
      });

      expect(amountInput.props.color).toBeUndefined();
    });

    it('clears amount to 0 when Back key pressed and keyboard not dirty', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-back'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('0');
    });

    it('updates amount when Back key pressed and keyboard is dirty', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-string'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-back'));
      });

      const amountInput = getByTestId(BuildQuoteSelectors.AMOUNT_INPUT);
      expect(amountInput.props.children).toContain('10');
    });
  });

  describe('handleSettingsPress', () => {
    it('navigates to settings modal and tracks analytics', () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      fireEvent.press(getByTestId('build-quote-settings-button'));

      expect(mockNavigate).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining('Settings'),
        }),
      );
    });
  });

  describe('handleBackPress', () => {
    it('calls goBack and tracks analytics', () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      fireEvent.press(getByTestId('build-quote-back-button'));

      expect(mockGoBack).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining('Back'),
        }),
      );
    });
  });

  describe('handlePaymentPillPress', () => {
    it('navigates to payment selection modal and tracks analytics', () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      fireEvent.press(getByTestId('build-quote-payment-pill'));

      expect(mockNavigate).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining('Payment'),
        }),
      );
    });
  });

  describe('handleQuickAmountPress', () => {
    it('tracks RAMPS_QUICK_AMOUNT_CLICKED when quick amount pressed', async () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId('keypad-trigger-empty'));
      });
      await act(async () => {
        fireEvent.press(getByTestId('quick-amount-50'));
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining('Quick Amount'),
        }),
      );
      expect(mockAddProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          currency_source: 'USD',
          location: 'Amount Input',
        }),
      );
    });
  });

  describe('client-side buy limits', () => {
    it('shows a below-min inline error and skips quote fetching', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 120,
        maxAmount: 1000,
      });
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      const { getByText, getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Minimum purchase is $120.00')).toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith(null);

      const continueButton = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
      expect(
        continueButton.props.isDisabled ??
          continueButton.props.disabled ??
          continueButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('shows an above-max inline error and skips quote fetching', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 10,
        maxAmount: 80,
      });
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      const { getByText, getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Maximum purchase is $80.00')).toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith(null);

      const continueButton = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
      expect(
        continueButton.props.isDisabled ??
          continueButton.props.disabled ??
          continueButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('fetches quotes normally when the amount is within provider limits', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 50,
        maxAmount: 200,
      });
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 100,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });
    });

    it('keeps quote fetch enabled while debounce settles after returning to a valid range', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 10,
        maxAmount: 200,
      });
      let debouncedAmount = 100;
      mockUseDebouncedValue.mockImplementation(() => debouncedAmount);
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      const { getByTestId, getByText, queryByText, rerender } =
        renderWithProvider(<BuildQuote />, {
          state: initialRootState,
        });

      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 100,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });

      fireEvent.press(getByTestId('keypad-trigger-string'));

      expect(getByText('Maximum purchase is $200.00')).toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith(null);

      debouncedAmount = 250;
      rerender(<BuildQuote />);

      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith(null);

      fireEvent.press(getByTestId('keypad-trigger-back'));

      // Amount 10 is valid — quote fetch stays enabled with
      // stale debounced params so the UI does not flash.
      expect(queryByText('Maximum purchase is $200.00')).not.toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 250,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });

      debouncedAmount = 10;
      rerender(<BuildQuote />);

      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 10,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });
    });

    it('treats amount equal to minAmount as valid (inclusive lower bound)', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 50,
        maxAmount: 200,
      });
      mockUseParams.mockReturnValue({ amount: 50 });
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(queryByText(/Minimum purchase/)).not.toBeOnTheScreen();
      expect(queryByText(/Maximum purchase/)).not.toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });
    });

    it('treats amount equal to maxAmount as valid (inclusive upper bound)', () => {
      const providerWithLimits = buildProviderWithLimits({
        minAmount: 50,
        maxAmount: 200,
      });
      mockUseParams.mockReturnValue({ amount: 200 });
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [providerWithLimits, NATIVE_PROVIDER],
          selectedProvider: providerWithLimits,
        }),
      );

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(queryByText(/Minimum purchase/)).not.toBeOnTheScreen();
      expect(queryByText(/Maximum purchase/)).not.toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 200,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });
    });

    it('does not crash when provider has no limits field', () => {
      mockUseRampsController.mockReturnValue(
        buildRampsControllerResult({
          providers: [WIDGET_PROVIDER, NATIVE_PROVIDER],
          selectedProvider: WIDGET_PROVIDER,
        }),
      );

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(queryByText(/Minimum purchase/)).not.toBeOnTheScreen();
      expect(queryByText(/Maximum purchase/)).not.toBeOnTheScreen();
      expect(mockUseRampsQuotes).toHaveBeenLastCalledWith({
        assetId: 'eip155:1/slip44:60',
        amount: 100,
        walletAddress: '0x1234567890123456789012345678901234567890',
        redirectUrl:
          'https://on-ramp-content.uat-api.cx.metamask.io/regions/fake-callback',
        paymentMethods: ['/payments/debit-credit-card'],
        providers: ['moonpay'],
      });
    });
  });

  describe('quoteFetchError', () => {
    it('tracks RAMPS_QUOTE_ERROR and shows BannerAlert when quote fetch fails', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: null,
        loading: false,
        error: new Error('Quote fetch failed'),
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({
          category: expect.stringContaining('Quote Error'),
        }),
      );
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('provider quote error (out-of-bounds / limits)', () => {
    it('shows provider error message when quotes response has errors and no successful quotes', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Minimum order amount is $30.00 USD',
            },
          ],
        },
        loading: false,
        error: null,
      });

      const { getByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Minimum order amount is $30.00 USD')).toBeOnTheScreen();
    });

    it('shows generic no-quotes error via TruncatedError when quotes response has errors without messages', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [{ provider: 'moonpay' }],
        },
        loading: false,
        error: null,
      });

      const { getByText, getByLabelText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(
        getByText(/problem fetching quotes|No providers available/i),
      ).toBeOnTheScreen();
      // Generic errors still use TruncatedError with info icon
      expect(getByLabelText('View error details')).toBeOnTheScreen();
    });

    it('disables continue button when provider returns a limit error', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Maximum order amount is $10,000 USD',
            },
          ],
        },
        loading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const continueButton = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
      expect(
        continueButton.props.isDisabled ??
          continueButton.props.disabled ??
          continueButton.props.accessibilityState?.disabled,
      ).toBe(true);
    });

    it('renders provider limit error as plain text without info icon', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Minimum order amount is $30.00 USD',
            },
          ],
        },
        loading: false,
        error: null,
      });

      const { getByText, queryByLabelText } = renderWithProvider(
        <BuildQuote />,
        {
          state: initialRootState,
        },
      );

      expect(getByText('Minimum order amount is $30.00 USD')).toBeOnTheScreen();
      // Provider limit errors are plain text — no info icon or modal
      expect(queryByLabelText('View error details')).not.toBeOnTheScreen();
    });

    it('shows change-provider option for generic errors without provider message', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [{ provider: 'moonpay' }],
        },
        loading: false,
        error: null,
      });

      const { getByLabelText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      fireEvent.press(getByLabelText('View error details'));

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          params: expect.objectContaining({
            showChangeProvider: true,
          }),
        }),
      );
    });

    it('does not navigate to error details modal for provider limit errors', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Minimum order amount is $30.00 USD',
            },
          ],
        },
        loading: false,
        error: null,
      });

      renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      // No info icon to press — limit errors are plain text
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          screen: expect.stringContaining('Error'),
        }),
      );
    });

    it('shows first provider error when multiple providers return errors', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Minimum order amount is $30.00 USD',
            },
            {
              provider: 'transak',
              error: 'Amount too low for this provider',
            },
          ],
        },
        loading: false,
        error: null,
      });

      const { getByText, queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Minimum order amount is $30.00 USD')).toBeOnTheScreen();
      expect(
        queryByText('Amount too low for this provider'),
      ).not.toBeOnTheScreen();
    });

    it('does not show provider error when some quotes succeed', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [WIDGET_PROVIDER_QUOTE],
          error: [
            {
              provider: 'transak',
              error: 'Minimum order amount is $30.00 USD',
            },
          ],
        },
        loading: false,
        error: null,
      });

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(
        queryByText('Minimum order amount is $30.00 USD'),
      ).not.toBeOnTheScreen();
      expect(queryByText(/encountered an error/i)).not.toBeOnTheScreen();
    });

    it('does not show provider error while quotes are loading', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [],
          error: [
            {
              provider: 'moonpay',
              error: 'Minimum order amount is $30.00 USD',
            },
          ],
        },
        loading: true,
        error: null,
      });

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(
        queryByText('Minimum order amount is $30.00 USD'),
      ).not.toBeOnTheScreen();
    });
  });

  describe('handleNativeProviderContinue', () => {
    beforeEach(() => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        selectedProvider: NATIVE_PROVIDER,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [SELECTED_PAYMENT_METHOD],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
      });
      mockUseRampsQuotes.mockReturnValue({
        data: { success: [NATIVE_PROVIDER_QUOTE] },
        loading: false,
        error: null,
      });
    });

    it('routes after auth when user has token', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(MOCK_TRANSAK_QUOTE);
      mockRouteAfterAuth.mockResolvedValue(undefined);

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockCheckExistingToken).toHaveBeenCalled();
      expect(mockGetBuyQuote).toHaveBeenCalledWith(
        'USD',
        'eip155:1/slip44:60',
        'eip155:1',
        '/payments/debit-credit-card',
        '100',
      );
      expect(mockRouteAfterAuth).toHaveBeenCalledWith(MOCK_TRANSAK_QUOTE, 100);
    });

    it('navigates to VerifyIdentity when user has no token', async () => {
      mockCheckExistingToken.mockResolvedValue(false);

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockCheckExistingToken).toHaveBeenCalled();
      expect(mockGetBuyQuote).not.toHaveBeenCalled();
      expect(mockRouteAfterAuth).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          amount: '100',
          currency: 'USD',
          assetId: 'eip155:1/slip44:60',
        }),
      );
    });

    it('sets rampsError when quote is null', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(null);

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockRouteAfterAuth).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('sets rampsError when transakCheckExistingToken throws', async () => {
      mockCheckExistingToken.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockGetBuyQuote).not.toHaveBeenCalled();
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('sets rampsError when transakRouteAfterAuth throws', async () => {
      mockCheckExistingToken.mockResolvedValue(true);
      mockGetBuyQuote.mockResolvedValue(MOCK_TRANSAK_QUOTE);
      mockRouteAfterAuth.mockRejectedValue(new Error('Routing failed'));

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('handleWidgetProviderContinue', () => {
    it('sets rampsError when getBuyWidgetData returns no URL', async () => {
      mockGetBuyWidgetData.mockResolvedValue({});

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockGetBuyWidgetData).toHaveBeenCalled();
      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });

    it('navigates to Checkout when useExternalBrowser is false', async () => {
      mockUseRampsQuotes.mockReturnValue({
        data: { success: [IN_APP_CHECKOUT_QUOTE] },
        loading: false,
        error: null,
      });
      mockGetBuyWidgetData.mockResolvedValue({
        url: 'https://checkout.example.com/embed',
        orderId: 'ord-456',
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(mockGetBuyWidgetData).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalled();
      const navigateArgs = JSON.stringify(mockNavigate.mock.calls);
      expect(navigateArgs).toContain('https://checkout.example.com/embed');
      expect(navigateArgs).toContain('MoonPay');
    });

    it('sets rampsError when getBuyWidgetData throws', async () => {
      mockGetBuyWidgetData.mockRejectedValue(
        new Error('Network request failed'),
      );

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      await act(async () => {
        fireEvent.press(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON));
      });

      expect(
        getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON),
      ).toBeOnTheScreen();
    });
  });

  describe('auto-select provider when none selected', () => {
    it('selects the first provider that supports the token', () => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [WIDGET_PROVIDER, NATIVE_PROVIDER],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [SELECTED_PAYMENT_METHOD],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).toHaveBeenCalledWith(WIDGET_PROVIDER, {
        autoSelected: true,
      });
    });

    it('does not auto-select when a provider is already selected', () => {
      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('does not auto-select when providers list is empty', () => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: null,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('does not auto-select when no token is selected', () => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [WIDGET_PROVIDER, NATIVE_PROVIDER],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: null,
        paymentMethods: [],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: null,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('skips providers that do not support the token', () => {
      const unsupportedProvider = {
        id: 'banxa',
        name: 'Banxa',
        supportedCryptoCurrencies: { 'eip155:1/erc20:0xother': true },
        links: [],
      };

      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [unsupportedProvider, NATIVE_PROVIDER],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [SELECTED_PAYMENT_METHOD],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).toHaveBeenCalledWith(NATIVE_PROVIDER, {
        autoSelected: true,
      });
    });

    it('does not auto-select when no provider supports the token', () => {
      const unsupportedProvider = {
        id: 'banxa',
        name: 'Banxa',
        supportedCryptoCurrencies: { 'eip155:1/erc20:0xother': true },
        links: [],
      };

      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [unsupportedProvider],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: null,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();
    });

    it('does not auto-select when screen is not focused', () => {
      const mockUseIsFocused = jest.requireMock('@react-navigation/native')
        .useIsFocused as jest.Mock;
      mockUseIsFocused.mockReturnValue(false);

      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [WIDGET_PROVIDER],
        selectedProvider: null,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [SELECTED_PAYMENT_METHOD],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
      });

      renderWithProvider(<BuildQuote />, { state: initialRootState });

      expect(mockSetSelectedProvider).not.toHaveBeenCalled();

      mockUseIsFocused.mockReturnValue(true);
    });
  });

  describe('Token unavailable for provider', () => {
    const TOKEN_ASSET = 'eip155:1/slip44:60';

    const transakProvider = {
      id: '/providers/transak',
      name: 'Transak',
      supportedCryptoCurrencies: { [TOKEN_ASSET]: true },
      links: [],
    };

    const mockUnavailableController = (overrides: Record<string, unknown>) => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [transakProvider, WIDGET_PROVIDER],
        selectedProvider: transakProvider,
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: null,
        ...overrides,
      });
    };

    beforeEach(() => {
      jest.useFakeTimers();
      mockUseParams.mockReturnValue({ assetId: TOKEN_ASSET });
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('navigates to token unavailable modal after debounce when payment methods are empty', () => {
      mockUnavailableController({});
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
          params: expect.objectContaining({ assetId: TOKEN_ASSET }),
        }),
      );
    });

    it('does not navigate while payment methods are still fetching', () => {
      mockUnavailableController({ paymentMethodsFetching: true });
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('does not navigate before payment methods status is success', () => {
      mockUnavailableController({ paymentMethodsStatus: 'loading' });
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('does not navigate when payment methods returned', () => {
      mockUnavailableController({
        paymentMethods: [SELECTED_PAYMENT_METHOD],
      });
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('passes buyFlowOrigin to token unavailable modal params', () => {
      mockUseParams.mockReturnValue({
        assetId: TOKEN_ASSET,
        buyFlowOrigin: 'tokenInfo' as const,
      });
      mockUnavailableController({});
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
          params: expect.objectContaining({
            assetId: TOKEN_ASSET,
            buyFlowOrigin: 'tokenInfo',
          }),
        }),
      );
    });

    it('does not open payment selection when token unavailable disables pill', () => {
      mockUnavailableController({});
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      mockNavigate.mockClear();
      fireEvent.press(getByTestId('build-quote-payment-pill'));
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampPaymentSelectionModal',
        }),
      );
    });

    it('navigates when token is missing from supportedCryptoCurrencies', () => {
      mockUnavailableController({
        selectedProvider: {
          id: '/providers/banxa',
          name: 'Banxa',
          supportedCryptoCurrencies: {
            // TOKEN_ASSET is NOT in the map — treated as unsupported
            'eip155:1/erc20:0xsomeother': true,
          },
          links: [],
        },
      });
      renderWithProvider(<BuildQuote />, { state: initialRootState });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('re-navigates when provider id changes', () => {
      mockUnavailableController({
        selectedProvider: {
          id: '/providers/a',
          name: 'A',
          supportedCryptoCurrencies: { [TOKEN_ASSET]: true },
          links: [],
        },
      });
      const { rerender } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).toHaveBeenCalled();
      mockNavigate.mockClear();
      mockUnavailableController({
        selectedProvider: {
          id: '/providers/b',
          name: 'B',
          supportedCryptoCurrencies: { [TOKEN_ASSET]: true },
          links: [],
        },
      });
      rerender(<BuildQuote />);
      act(() => {
        jest.advanceTimersByTime(650);
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    describe('auto-switch when providerAutoSelected', () => {
      const BTC_ASSET = 'eip155:1/slip44:0';

      const paypalProvider = {
        id: '/providers/paypal',
        name: 'PayPal',
        supportedCryptoCurrencies: { [TOKEN_ASSET]: true, [BTC_ASSET]: false },
        links: [],
      };

      const coinbaseProvider = {
        id: '/providers/coinbase',
        name: 'Coinbase',
        supportedCryptoCurrencies: { [TOKEN_ASSET]: true, [BTC_ASSET]: true },
        links: [],
      };

      const autoSelectedState = {
        ...initialRootState,
        engine: {
          ...initialRootState.engine,
          backgroundState: {
            ...initialRootState.engine.backgroundState,
            RampsController: {
              ...initialRootState.engine.backgroundState.RampsController,
              providerAutoSelected: true,
            },
          },
        },
      };

      it('auto-switches to a supporting provider instead of showing the modal', () => {
        mockUnavailableController({
          selectedProvider: paypalProvider,
          providers: [paypalProvider, coinbaseProvider],
          selectedToken: {
            assetId: BTC_ASSET,
            chainId: 'eip155:1',
            symbol: 'BTC',
          },
        });
        mockUseParams.mockReturnValue({ assetId: BTC_ASSET });

        renderWithProvider(<BuildQuote />, { state: autoSelectedState });
        act(() => {
          jest.advanceTimersByTime(650);
        });

        expect(mockSetSelectedProvider).toHaveBeenCalledWith(coinbaseProvider, {
          autoSelected: true,
        });
        expect(mockNavigate).not.toHaveBeenCalledWith(
          'RampModals',
          expect.objectContaining({
            screen: 'RampTokenNotAvailableModal',
          }),
        );
      });

      it('falls back to modal when no provider supports the token', () => {
        mockUnavailableController({
          selectedProvider: paypalProvider,
          providers: [paypalProvider],
          selectedToken: {
            assetId: BTC_ASSET,
            chainId: 'eip155:1',
            symbol: 'BTC',
          },
        });
        mockUseParams.mockReturnValue({ assetId: BTC_ASSET });

        renderWithProvider(<BuildQuote />, { state: autoSelectedState });
        act(() => {
          jest.advanceTimersByTime(650);
        });

        expect(mockSetSelectedProvider).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
          'RampModals',
          expect.objectContaining({
            screen: 'RampTokenNotAvailableModal',
          }),
        );
      });

      it('shows modal when provider was not auto-selected', () => {
        mockUnavailableController({
          selectedProvider: paypalProvider,
          providers: [paypalProvider, coinbaseProvider],
          selectedToken: {
            assetId: BTC_ASSET,
            chainId: 'eip155:1',
            symbol: 'BTC',
          },
        });
        mockUseParams.mockReturnValue({ assetId: BTC_ASSET });

        renderWithProvider(<BuildQuote />, { state: initialRootState });
        act(() => {
          jest.advanceTimersByTime(650);
        });

        expect(mockSetSelectedProvider).not.toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith(
          'RampModals',
          expect.objectContaining({
            screen: 'RampTokenNotAvailableModal',
          }),
        );
      });
    });
  });

  describe('selectedQuote matching', () => {
    const noQuotesErrorPattern =
      /We encountered a problem fetching quotes from/i;

    it('shows Powered by text when quote provider matches selected provider', () => {
      const { getByText, queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Powered by MoonPay')).toBeOnTheScreen();
      expect(queryByText(noQuotesErrorPattern)).not.toBeOnTheScreen();
    });

    it('shows no-quotes error when quote provider does not match selected provider', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [{ ...WIDGET_PROVIDER_QUOTE, provider: 'other-provider' }],
        },
        loading: false,
        error: null,
      });

      const { getByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText(noQuotesErrorPattern)).toBeOnTheScreen();
    });

    it('shows no-quotes error when quotes response has no entries', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: { success: [] },
        loading: false,
        error: null,
      });

      const { getByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText(noQuotesErrorPattern)).toBeOnTheScreen();
    });

    it('does not show error when quotes are still loading', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: null,
        loading: true,
        error: null,
      });

      const { queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(queryByText(noQuotesErrorPattern)).not.toBeOnTheScreen();
    });

    it('continue button is disabled when no matching quote', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [{ ...WIDGET_PROVIDER_QUOTE, provider: 'other-provider' }],
        },
        loading: false,
        error: null,
      });

      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const continueButton = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
      expect(continueButton.props.accessibilityState?.disabled).toBe(true);
    });

    it('continue button is enabled when quote matches', () => {
      const { getByTestId } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      const continueButton = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
      expect(continueButton.props.accessibilityState?.disabled).not.toBe(true);
    });

    it('matches quote when API returns prefixed provider ID', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [
            { ...WIDGET_PROVIDER_QUOTE, provider: '/providers/moonpay' },
          ],
        },
        loading: false,
        error: null,
      });

      const { getByText, queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Powered by MoonPay')).toBeOnTheScreen();
      expect(queryByText(noQuotesErrorPattern)).not.toBeOnTheScreen();
    });

    it('matches quote when selected provider has prefixed ID and quote has short ID', () => {
      mockUseRampsController.mockReturnValue({
        userRegion: USER_REGION,
        providers: [
          { ...WIDGET_PROVIDER, id: '/providers/moonpay' },
          NATIVE_PROVIDER,
        ],
        selectedProvider: { ...WIDGET_PROVIDER, id: '/providers/moonpay' },
        setSelectedProvider: mockSetSelectedProvider,
        selectedToken: SELECTED_TOKEN,
        paymentMethods: [SELECTED_PAYMENT_METHOD],
        getBuyWidgetData: mockGetBuyWidgetData,
        addPrecreatedOrder: mockAddPrecreatedOrder,
        addOrder: mockAddOrder,
        getOrderFromCallback: mockGetOrderFromCallback,
        paymentMethodsLoading: false,
        paymentMethodsFetching: false,
        paymentMethodsStatus: 'success',
        selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
      });

      const { getByText, queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Powered by MoonPay')).toBeOnTheScreen();
      expect(queryByText(noQuotesErrorPattern)).not.toBeOnTheScreen();
    });

    it('finds matching quote even if it is not the first in the array', () => {
      mockUseRampsQuotes.mockReturnValue({
        data: {
          success: [
            { ...WIDGET_PROVIDER_QUOTE, provider: 'other-provider' },
            WIDGET_PROVIDER_QUOTE,
          ],
        },
        loading: false,
        error: null,
      });

      const { getByText, queryByText } = renderWithProvider(<BuildQuote />, {
        state: initialRootState,
      });

      expect(getByText('Powered by MoonPay')).toBeOnTheScreen();
      expect(queryByText(noQuotesErrorPattern)).not.toBeOnTheScreen();
    });
  });
});
