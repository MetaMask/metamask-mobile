import { createBuildQuoteNavDetails } from './BuildQuote';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  }),
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  useParams: () => ({}),
}));

jest.mock('../../../../hooks/useStyles', () => ({
  useStyles: () => ({ styles: {} }),
}));

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({ formatCurrency: (n: number) => `$${n}` }),
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => jest.fn(() => null),
}));

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    userRegion: { country: { currency: 'USD', quickAmounts: [50, 100, 200] } },
    selectedProvider: { id: 'paypal', name: 'PayPal' },
    selectedToken: { assetId: 'eip155:1', chainId: 'eip155:1', symbol: 'ETH' },
    getBuyWidgetData: jest.fn(),
    addPrecreatedOrder: jest.fn(),
    paymentMethodsLoading: false,
    selectedPaymentMethod: { id: 'card', name: 'Card' },
  }),
}));

jest.mock('../../hooks/useRampsOrders', () => ({
  useRampsOrders: () => ({
    addOrder: jest.fn(),
    getOrderFromCallback: jest.fn(),
  }),
}));

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: () => ({
    data: null,
    loading: false,
    error: null,
  }),
}));

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: () => '0x123',
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: (val: number) => val,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: jest.fn(),
    createEventBuilder: () => ({
      addProperties: () => ({ build: () => ({}) }),
    }),
  }),
}));

jest.mock('../../../../../reducers/fiatOrders', () => ({
  getRampRoutingDecision: () => 'AGGREGATOR',
  UnifiedRampRoutingType: { AGGREGATOR: 'AGGREGATOR' },
}));

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    checkExistingToken: jest.fn(),
    getBuyQuote: jest.fn(),
  }),
}));

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({ routeAfterAuthentication: jest.fn() }),
}));

jest.mock('../../Aggregator/components/ScreenLayout', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock(
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('../../../../Base/Keypad', () => ({
  __esModule: true,
  default: () => null,
  Keys: { Back: 'Back' },
}));

jest.mock('../../components/PaymentMethodPill', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../components/QuickAmounts', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => ({
  __esModule: true,
  default: () => null,
  TextVariant: {},
  TextColor: {},
}));

jest.mock('@metamask/design-system-react-native', () => ({
  Button: () => null,
  ButtonVariant: {},
  ButtonSize: {},
  IconName: {},
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock(
  '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert',
  () => ({
    __esModule: true,
    default: () => null,
  }),
);

jest.mock('../../components/TruncatedError', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('../Modals/SettingsModal', () => ({
  createSettingsModalNavDetails: () => ['SettingsModal'],
}));

jest.mock('../Modals/PaymentSelectionModal', () => ({
  createPaymentSelectionModalNavigationDetails: () => ['PaymentSelectionModal'],
}));

jest.mock('../Modals/TokenNotAvailableModal', () => ({
  createTokenNotAvailableModalNavigationDetails: () => [
    'TokenNotAvailableModal',
  ],
}));

jest.mock('../Checkout', () => ({
  createCheckoutNavDetails: () => ['Checkout'],
}));

jest.mock('../NativeFlow/VerifyIdentity', () => ({
  createV2VerifyIdentityNavDetails: () => ['VerifyIdentity'],
}));

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
