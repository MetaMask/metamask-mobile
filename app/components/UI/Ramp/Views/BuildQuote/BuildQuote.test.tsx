import React from 'react';
import { act, fireEvent } from '@testing-library/react-native';
import BuildQuote, { createBuildQuoteNavDetails } from './BuildQuote';
import { renderScreen } from '../../../../../util/test/renderWithProvider';
import Routes from '../../../../../constants/navigation/Routes';
import { BuildQuoteSelectors } from '../../Aggregator/Views/BuildQuote/BuildQuote.testIds';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockReset = jest.fn();
const mockSetParams = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    setParams: mockSetParams,
  }),
}));

const mockUseParams = jest.fn<Record<string, unknown>, []>(() => ({}));
jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({ styles: {} }),
}));

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({ formatCurrency: (n: number) => `$${n}` }),
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => jest.fn(() => ({ networkName: 'Ethereum' })),
}));

const mockGetBuyWidgetData = jest.fn();
const mockAddPrecreatedOrder = jest.fn();

const rampsControllerState = {
  userRegion: {
    country: { currency: 'USD', quickAmounts: [50, 100, 200] },
    regionCode: 'US',
  },
  selectedProvider: {
    id: 'paypal',
    name: 'PayPal',
    links: [{ name: 'Support', url: 'https://support.paypal.com' }],
  },
  selectedToken: {
    assetId: 'eip155:1',
    chainId: 'eip155:1',
    symbol: 'ETH',
  },
  getBuyWidgetData: mockGetBuyWidgetData,
  addPrecreatedOrder: mockAddPrecreatedOrder,
  paymentMethodsLoading: false,
  selectedPaymentMethod: { id: 'card', name: 'Card' },
};

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => rampsControllerState,
}));

jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: () => ({
    addOrder: jest.fn(),
    getOrderFromCallback: jest.fn(),
  }),
}));

const quotesState = {
  data: null as unknown,
  loading: false,
  error: null as unknown,
};

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: (params: unknown) => {
    if (!params) {
      return { data: null, loading: false, error: null };
    }
    return quotesState;
  },
}));

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x123',
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: (val: number) => val,
}));

const mockTrackEvent = jest.fn();
jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: () => ({
      addProperties: (props: object) => ({ build: () => ({ ...props }) }),
    }),
  }),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getRampRoutingDecision: () => 'AGGREGATOR',
  UnifiedRampRoutingType: { AGGREGATOR: 'AGGREGATOR' },
}));

const mockTransakCheckExistingToken = jest.fn();
const mockTransakGetBuyQuote = jest.fn();
const mockTransakRouteAfterAuth = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    checkExistingToken: mockTransakCheckExistingToken,
    getBuyQuote: mockTransakGetBuyQuote,
  }),
}));

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockTransakRouteAfterAuth,
  }),
}));

jest.mock('../../../../../util/device', () => ({
  isAndroid: jest.fn(() => false),
}));

jest.mock('react-native-inappbrowser-reborn', () => ({
  openAuth: jest.fn(() =>
    Promise.resolve({
      type: 'success',
      url: 'metamask://on-ramp/providers/paypal',
    }),
  ),
  isAvailable: jest.fn(() => Promise.resolve(true)),
  closeAuth: jest.fn(),
}));

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Linking: {
      ...RN.Linking,
      openURL: jest.fn(() => Promise.resolve()),
    },
  };
});

jest.mock('../../Aggregator/components/ScreenLayout', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { View } = require('react-native');
  const Layout = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Layout.Body = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  Layout.Content = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, null, children);
  return { __esModule: true, default: Layout };
});

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
    const React = require('react');
    const { Pressable } = require('react-native');
    return {
      __esModule: true,
      default: ({
        onBack,
        endButtonIconProps,
      }: {
        onBack?: () => void;
        endButtonIconProps?: { onPress?: () => void; testID?: string }[];
      }) =>
        React.createElement(
          React.Fragment,
          null,
          onBack &&
            React.createElement(
              Pressable,
              {
                testID: 'build-quote-back-button',
                onPress: onBack,
              },
              'Back',
            ),
          endButtonIconProps?.map((props, i) =>
            React.createElement(
              Pressable,
              {
                key: i,
                testID: props.testID || 'settings',
                onPress: props.onPress,
              },
              'Settings',
            ),
          ),
        ),
    };
  },
);

jest.mock('../../../../Base/Keypad', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { Pressable } = require('react-native');
  const Keys = { Back: 'Back' };
  return {
    __esModule: true,
    default: ({
      onChange,
      value,
    }: {
      onChange: (data: {
        value: string;
        valueAsNumber: number;
        pressedKey: string;
      }) => void;
      value: string;
    }) =>
      React.createElement(
        React.Fragment,
        null,
        React.createElement(
          Pressable,
          {
            testID: 'keypad-trigger',
            onPress: () =>
              onChange({
                value: '150',
                valueAsNumber: 150,
                pressedKey: '1',
              }),
          },
          'Keypad',
        ),
        React.createElement(
          Pressable,
          {
            testID: 'keypad-back-trigger',
            onPress: () =>
              onChange({
                value: '0',
                valueAsNumber: 0,
                pressedKey: Keys.Back,
              }),
          },
          'KeypadBack',
        ),
      ),
    Keys,
  };
});

jest.mock('../../components/PaymentMethodPill', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    __esModule: true,
    default: ({ onPress, label }: { onPress: () => void; label: string }) =>
      React.createElement(
        Pressable,
        { testID: 'payment-method-pill', onPress },
        label,
      ),
  };
});

jest.mock('../../components/QuickAmounts', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { View, Pressable } = require('react-native');
  return {
    __esModule: true,
    default: ({
      amounts,
      onAmountPress,
    }: {
      amounts: number[];
      onAmountPress: (n: number) => void;
    }) =>
      React.createElement(
        View,
        null,
        amounts.map((a) =>
          React.createElement(
            Pressable,
            {
              key: a,
              testID: `quick-amount-${a}`,
              onPress: () => onAmountPress(a),
            },
            String(a),
          ),
        ),
      ),
  };
});

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      children,
      testID,
    }: {
      children?: React.ReactNode;
      testID?: string;
    }) => React.createElement(Text, { testID }, children),
    TextVariant: {},
    TextColor: {},
  };
});

jest.mock('@metamask/design-system-react-native', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { Pressable } = require('react-native');
  return {
    Button: ({
      onPress,
      isDisabled,
      isLoading,
      children,
      testID,
    }: {
      onPress: () => void;
      isDisabled?: boolean;
      isLoading?: boolean;
      children: React.ReactNode;
      testID?: string;
    }) =>
      React.createElement(
        Pressable,
        {
          testID,
          onPress: isDisabled || isLoading ? undefined : onPress,
          accessibilityState: { disabled: isDisabled || isLoading },
        },
        children,
      ),
    ButtonVariant: {},
    ButtonSize: {},
    IconName: {},
  };
});

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, string>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
}));

jest.mock(
  '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert',
  () => {
    /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
    const React = require('react');
    const { Text } = require('react-native');
    return {
      __esModule: true,
      default: ({ description }: { description: string }) =>
        React.createElement(Text, { testID: 'banner-alert' }, description),
    };
  },
);

jest.mock('../../components/TruncatedError', () => {
  /* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, @typescript-eslint/no-shadow */
  const React = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({
      error,
      errorDetails,
    }: {
      error?: string;
      errorDetails?: string;
    }) =>
      React.createElement(
        View,
        { testID: 'truncated-error' },
        error && React.createElement(Text, null, error),
        errorDetails &&
          React.createElement(
            Text,
            { testID: 'truncated-error-details' },
            errorDetails,
          ),
      ),
  };
});

jest.mock('../Modals/SettingsModal', () => ({
  createSettingsModalNavDetails: () => ['SettingsModal'],
}));

jest.mock('../Modals/PaymentSelectionModal', () => ({
  createPaymentSelectionModalNavigationDetails: (opts: { amount: number }) => [
    'PaymentSelectionModal',
    opts,
  ],
}));

jest.mock('../Modals/TokenNotAvailableModal', () => ({
  createTokenNotAvailableModalNavigationDetails: () => [
    'TokenNotAvailableModal',
  ],
}));

jest.mock('../Checkout', () => ({
  createCheckoutNavDetails: (opts: unknown) => ['Checkout', opts],
}));

jest.mock('../NativeFlow/VerifyIdentity', () => ({
  createV2VerifyIdentityNavDetails: (opts: unknown) => ['VerifyIdentity', opts],
}));

function render() {
  return renderScreen(BuildQuote, {
    name: Routes.RAMP.AMOUNT_INPUT,
  });
}

describe('createBuildQuoteNavDetails', () => {
  it('returns nav details for TOKEN_SELECTION with AMOUNT_INPUT screen', () => {
    const result = createBuildQuoteNavDetails();
    expect(result[0]).toBe('RampTokenSelection');
    expect(result[1].screen).toBe('RampTokenSelection');
    expect(result[1].params?.screen).toBe('RampAmountInput');
  });

  it('passes params when provided', () => {
    const result = createBuildQuoteNavDetails({
      assetId: 'eip155:1',
      nativeFlowError: 'Error',
    });
    expect(result[1].params?.params).toEqual({
      assetId: 'eip155:1',
      nativeFlowError: 'Error',
    });
  });

  it('handles undefined params', () => {
    const result = createBuildQuoteNavDetails();
    expect(result[1].params?.params).toBeUndefined();
  });
});

describe('BuildQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockReturnValue({});
    quotesState.data = null;
    quotesState.loading = false;
    quotesState.error = null;
    rampsControllerState.selectedProvider = {
      id: 'paypal',
      name: 'PayPal',
      links: [{ name: 'Support', url: 'https://support.paypal.com' }],
    };
    rampsControllerState.selectedToken = {
      assetId: 'eip155:1',
      chainId: 'eip155:1',
      symbol: 'ETH',
    };
    rampsControllerState.selectedPaymentMethod = { id: 'card', name: 'Card' };
  });

  it('renders amount input and shows continue when amount is set', () => {
    const { getByTestId } = render();
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toBeOnTheScreen();
    expect(getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON)).toBeOnTheScreen();
  });

  it('shows quick amounts when amount is cleared to zero', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('keypad-back-trigger'));
    expect(getByTestId('quick-amount-50')).toBeOnTheScreen();
    expect(getByTestId('quick-amount-100')).toBeOnTheScreen();
    expect(getByTestId('quick-amount-200')).toBeOnTheScreen();
  });

  it('renders back button and triggers goBack on press', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('build-quote-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders settings button and navigates to settings on press', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('build-quote-settings-button'));
    expect(mockNavigate).toHaveBeenCalledWith('SettingsModal');
  });

  it('updates amount when quick amount is pressed', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('keypad-back-trigger'));
    fireEvent.press(getByTestId('quick-amount-100'));
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toHaveTextContent(
      '$100',
    );
  });

  it('navigates to payment selection when payment pill is pressed', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('payment-method-pill'));
    expect(mockNavigate).toHaveBeenCalledWith(
      'PaymentSelectionModal',
      expect.objectContaining({ amount: 100 }),
    );
  });

  it('updates amount when keypad trigger is pressed', () => {
    const { getByTestId } = render();
    fireEvent.press(getByTestId('keypad-trigger'));
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toHaveTextContent(
      '$150',
    );
  });

  it('sets nativeFlowError from params and clears it from navigation', () => {
    mockUseParams.mockReturnValue({
      nativeFlowError: 'Transak failed',
    });
    const { getByTestId } = render();
    expect(getByTestId('truncated-error')).toBeOnTheScreen();
    expect(getByTestId('truncated-error')).toHaveTextContent('Transak failed');
    expect(mockSetParams).toHaveBeenCalledWith({ nativeFlowError: undefined });
  });

  it('renders quote fetch error banner when useRampsQuotes returns error', () => {
    quotesState.error = new Error('Network error');
    quotesState.data = { success: [] };
    const { getByTestId } = render();
    expect(getByTestId('banner-alert')).toBeOnTheScreen();
  });

  it('shows continue button disabled when no quote is available', () => {
    quotesState.data = { success: [] };
    quotesState.loading = false;
    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);
    expect(continueBtn.props.accessibilityState?.disabled).toBe(true);
  });

  it('navigates to VerifyIdentity when native provider has no token', async () => {
    const nativeQuote = {
      provider: 'transak',
      providerInfo: { id: 'transak', name: 'Transak', type: 'native' },
      quote: { buyURL: 'https://transak.com/buy' },
    };
    quotesState.data = { success: [nativeQuote] };
    quotesState.loading = false;
    mockTransakCheckExistingToken.mockResolvedValue(false);
    rampsControllerState.selectedProvider = {
      id: 'transak',
      name: 'Transak',
      links: [],
    };
    rampsControllerState.selectedToken = {
      assetId: 'eip155:1',
      chainId: 'eip155:1',
      symbol: 'ETH',
    };

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(mockNavigate).toHaveBeenCalledWith(
      'VerifyIdentity',
      expect.objectContaining({
        amount: '100',
        currency: 'USD',
        assetId: 'eip155:1',
      }),
    );
  });

  it('shows TruncatedError when getBuyWidgetData returns no URL', async () => {
    const customActionQuote = {
      provider: 'paypal',
      providerInfo: { id: 'paypal', name: 'PayPal', type: 'aggregator' },
      quote: { buyURL: 'https://paypal.com/buy', isCustomAction: true },
    };
    quotesState.data = { success: [customActionQuote] };
    quotesState.loading = false;
    mockGetBuyWidgetData.mockResolvedValue({ url: undefined });

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(getByTestId('truncated-error')).toBeOnTheScreen();
  });

  it('matches snapshot when fully configured with quote', () => {
    quotesState.data = {
      success: [
        {
          provider: 'paypal',
          providerInfo: { id: 'paypal', name: 'PayPal', type: 'aggregator' },
          quote: { buyURL: 'https://paypal.com/buy', isCustomAction: true },
        },
      ],
    };
    quotesState.loading = false;
    mockGetBuyWidgetData.mockResolvedValue({
      url: 'https://paypal.com/widget',
      orderId: 'ord-1',
    });

    const { toJSON } = render();
    expect(toJSON()).toMatchSnapshot();
  });

  it('sets default amount from user region', () => {
    rampsControllerState.userRegion = {
      country: {
        currency: 'EUR',
        defaultAmount: 250,
        quickAmounts: [100, 250],
      },
      regionCode: 'DE',
    };

    const { getByTestId } = render();
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toHaveTextContent(
      '$250',
    );

    rampsControllerState.userRegion = {
      country: { currency: 'USD', quickAmounts: [50, 100, 200] },
      regionCode: 'US',
    };
  });

  it('routes authenticated native provider to quote result', async () => {
    rampsControllerState.userRegion = {
      country: { currency: 'USD', quickAmounts: [50, 100, 200] },
      regionCode: 'US',
    };
    rampsControllerState.selectedProvider = {
      id: 'transak',
      name: 'Transak',
      links: [],
    };
    rampsControllerState.selectedToken = {
      assetId: 'eip155:1',
      chainId: 'eip155:1',
      symbol: 'ETH',
    };

    const nativeQuote = {
      provider: 'transak',
      providerInfo: { id: 'transak', name: 'Transak', type: 'native' },
      quote: { buyURL: 'https://transak.com/buy' },
    };
    quotesState.data = { success: [nativeQuote] };
    quotesState.loading = false;
    mockTransakCheckExistingToken.mockResolvedValue(true);
    mockTransakGetBuyQuote.mockResolvedValue({ orderId: 'tk-order' });
    mockTransakRouteAfterAuth.mockResolvedValue(undefined);

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(mockTransakCheckExistingToken).toHaveBeenCalled();
    expect(mockTransakGetBuyQuote).toHaveBeenCalledWith(
      'USD',
      'eip155:1',
      'eip155:1',
      'card',
      '100',
    );
    expect(mockTransakRouteAfterAuth).toHaveBeenCalledWith({
      orderId: 'tk-order',
    });
  });

  it('shows error when native provider getBuyQuote returns null', async () => {
    const nativeQuote = {
      provider: 'transak',
      providerInfo: { id: 'transak', name: 'Transak', type: 'native' },
      quote: { buyURL: 'https://transak.com/buy' },
    };
    quotesState.data = { success: [nativeQuote] };
    quotesState.loading = false;
    mockTransakCheckExistingToken.mockResolvedValue(true);
    mockTransakGetBuyQuote.mockResolvedValue(null);

    rampsControllerState.selectedProvider = {
      id: 'transak',
      name: 'Transak',
      links: [],
    };

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(getByTestId('truncated-error')).toBeOnTheScreen();
  });

  it('displays no quotes error when quote fetch succeeds but no matching quote', () => {
    quotesState.data = {
      success: [
        {
          provider: 'moonpay',
          providerInfo: { id: 'moonpay', name: 'MoonPay', type: 'aggregator' },
          quote: {},
        },
      ],
    };
    quotesState.loading = false;
    rampsControllerState.selectedProvider = {
      id: 'paypal',
      name: 'PayPal',
      links: [],
    };

    const { getByTestId } = render();
    const errorDetails = getByTestId('truncated-error-details');
    expect(errorDetails.props.children).toContain(
      'fiat_on_ramp.no_quotes_error',
    );
  });

  it('tracks RAMPS_SCREEN_VIEWED event on mount', () => {
    render();
    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Amount Input',
        ramp_type: 'UNIFIED_BUY_2',
        ramp_routing: 'AGGREGATOR',
      }),
    );
  });

  it('tracks RAMPS_QUICK_AMOUNT_CLICKED event', () => {
    rampsControllerState.userRegion = {
      country: { currency: 'USD', quickAmounts: [50, 100, 200] },
      regionCode: 'US',
    };
    rampsControllerState.selectedProvider = {
      id: 'paypal',
      name: 'PayPal',
      links: [{ name: 'Support', url: 'https://support.paypal.com' }],
    };

    mockTrackEvent.mockClear();
    const { getByTestId } = render();
    fireEvent.press(getByTestId('keypad-back-trigger'));
    fireEvent.press(getByTestId('quick-amount-50'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 50,
        currency_source: 'USD',
        location: 'Amount Input',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });

  it('tracks RAMPS_BACK_BUTTON_CLICKED event', () => {
    mockTrackEvent.mockClear();
    const { getByTestId } = render();
    fireEvent.press(getByTestId('build-quote-back-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Amount Input',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });

  it('tracks RAMPS_SETTINGS_CLICKED event', () => {
    mockTrackEvent.mockClear();
    const { getByTestId } = render();
    fireEvent.press(getByTestId('build-quote-settings-button'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        location: 'Amount Input',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });

  it('tracks RAMPS_PAYMENT_METHOD_SELECTOR_CLICKED event', () => {
    mockTrackEvent.mockClear();
    const { getByTestId } = render();
    fireEvent.press(getByTestId('payment-method-pill'));

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        current_payment_method: 'card',
        location: 'Amount Input',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });

  it('tracks RAMPS_QUOTE_ERROR event when quote fetch fails', () => {
    mockTrackEvent.mockClear();
    quotesState.error = new Error('Quote service unavailable');
    quotesState.data = { success: [] };

    render();

    expect(mockTrackEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 100,
        currency_source: 'USD',
        currency_destination: 'eip155:1',
        payment_method_id: 'card',
        chain_id: 'eip155:1',
        ramp_type: 'UNIFIED_BUY_2',
      }),
    );
  });

  it('handles widget provider error gracefully', async () => {
    const aggregatorQuote = {
      provider: 'moonpay',
      providerInfo: { id: 'moonpay', name: 'MoonPay', type: 'aggregator' },
      quote: { buyURL: 'https://moonpay.com/buy' },
    };
    quotesState.data = { success: [aggregatorQuote] };
    quotesState.loading = false;
    mockGetBuyWidgetData.mockRejectedValue(new Error('Widget API failed'));

    rampsControllerState.selectedProvider = {
      id: 'moonpay',
      name: 'MoonPay',
      links: [],
    };

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(getByTestId('truncated-error')).toBeOnTheScreen();
  });

  it('handles native provider error gracefully', async () => {
    const nativeQuote = {
      provider: 'transak',
      providerInfo: { id: 'transak', name: 'Transak', type: 'native' },
      quote: { buyURL: 'https://transak.com/buy' },
    };
    quotesState.data = { success: [nativeQuote] };
    quotesState.loading = false;
    mockTransakCheckExistingToken.mockRejectedValue(
      new Error('Auth check failed'),
    );

    rampsControllerState.selectedProvider = {
      id: 'transak',
      name: 'Transak',
      links: [],
    };

    const { getByTestId } = render();
    const continueBtn = getByTestId(BuildQuoteSelectors.CONTINUE_BUTTON);

    await act(async () => {
      fireEvent.press(continueBtn);
    });

    expect(getByTestId('truncated-error')).toBeOnTheScreen();
  });

  it('updates amount when keypad back is pressed on dirty keyboard', () => {
    const { getByTestId } = render();

    fireEvent.press(getByTestId('keypad-trigger'));
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toHaveTextContent(
      '$150',
    );

    fireEvent.press(getByTestId('keypad-back-trigger'));
    expect(getByTestId(BuildQuoteSelectors.AMOUNT_INPUT)).toHaveTextContent(
      '$0',
    );
  });
});
