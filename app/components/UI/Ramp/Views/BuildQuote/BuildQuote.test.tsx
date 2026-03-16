import React from 'react';
import { fireEvent, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import initialRootState from '../../../../../util/test/initial-root-state';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';
import Routes from '../../../../../constants/navigation/Routes';
import { useNavigation } from '@react-navigation/native';

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
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: jest.fn(),
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

jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: jest.fn(),
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
  useDebouncedValue: (value: number) => value,
}));

jest.mock('../../hooks/useBlinkingCursor', () => ({
  useBlinkingCursor: () => 1,
}));

const mockUseRampsController = jest.requireMock(
  '../../hooks/useRampsController',
).useRampsController as jest.Mock;

const mockUseRampsOrders = jest.requireMock('../../hooks/useRampsOrders')
  .useRampsOrders as jest.Mock;

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
const mockGetBuyWidgetData = jest.fn();
const mockAddOrder = jest.fn();
const mockGetOrderFromCallback = jest.fn();
const mockAddPrecreatedOrder = jest.fn();

const WIDGET_PROVIDER_QUOTE = {
  provider: 'moonpay',
  id: 'quote-1',
  inputAmount: 100,
  inputCurrency: 'USD',
  outputAmount: '0.05',
  outputCurrency: { symbol: 'ETH', assetId: 'eip155:1/slip44:60' },
};

const WIDGET_PROVIDER = {
  id: 'moonpay',
  name: 'MoonPay',
  supportedCryptoCurrencies: { 'eip155:1/slip44:60': true },
  links: [],
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

describe('BuildQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    mockUseRampsController.mockReturnValue({
      userRegion: USER_REGION,
      selectedProvider: WIDGET_PROVIDER,
      selectedToken: SELECTED_TOKEN,
      getBuyWidgetData: mockGetBuyWidgetData,
      addPrecreatedOrder: mockAddPrecreatedOrder,
      paymentMethodsLoading: false,
      selectedPaymentMethod: SELECTED_PAYMENT_METHOD,
    });
    mockUseRampsOrders.mockReturnValue({
      addOrder: mockAddOrder,
      getOrderFromCallback: mockGetOrderFromCallback,
    });
    mockUseRampsQuotes.mockReturnValue({
      data: { success: [WIDGET_PROVIDER_QUOTE] },
      loading: false,
      error: null,
    });
    mockUseTransakController.mockReturnValue({
      checkExistingToken: jest.fn(),
      getBuyQuote: jest.fn(),
    });
    mockUseTransakRouting.mockReturnValue({
      routeAfterAuthentication: jest.fn(),
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
      navigate: jest.fn(),
      goBack: jest.fn(),
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

    it('resets to order details when returnDestination is order (InAppBrowser success path)', async () => {
      mockDeviceIsAndroid.mockReturnValue(false);
      mockInAppBrowser.isAvailable.mockResolvedValue(true);
      mockInAppBrowser.openAuth.mockResolvedValue({
        type: 'success',
        url: 'metamask://on-ramp/providers/moonpay?orderId=ord-123',
      });
      mockGetOrderFromCallback.mockResolvedValue({
        providerOrderId: 'ord-123',
        status: 'Pending',
        cryptoAmount: '0.05',
        cryptoCurrency: { symbol: 'ETH' },
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

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockAddOrder).toHaveBeenCalled();
      expect(mockNavigationReset).toHaveBeenCalledWith({
        index: 0,
        routes: [
          {
            name: Routes.RAMP.RAMPS_ORDER_DETAILS,
            params: {
              orderId: 'ord-123',
              showCloseButton: true,
            },
          },
        ],
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
  });
});
