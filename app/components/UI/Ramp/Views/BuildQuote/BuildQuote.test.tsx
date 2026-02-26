import React from 'react';
import { InteractionManager } from 'react-native';
import { fireEvent, render, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { RampsToken } from '../../hooks/useRampTokens';
import type { CaipChainId } from '@metamask/utils';
import Logger from '../../../../../util/Logger';
import { FIAT_ORDER_PROVIDERS } from '../../../../../constants/on-ramp';

const flushPromises = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 0));

const mockUseEffect = jest.requireActual('react').useEffect;

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockSetParams = jest.fn();
const mockGetWidgetUrl = jest.fn<
  Promise<string | null>,
  [quote: Record<string, unknown>]
>(async (quote) => {
  const buyUrl = (quote as { quote?: { buyURL: string } })?.quote?.buyURL;
  if (!buyUrl) return null;
  // Simulate the fetch behavior
  return 'https://global.transak.com/?apiKey=test';
});

const MOCK_ASSET_ID =
  'eip155:1/erc20:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const MOCK_CHAIN_ID = 'eip155:1' as CaipChainId;

const createMockToken = (overrides?: Partial<RampsToken>): RampsToken => ({
  assetId: MOCK_ASSET_ID,
  chainId: MOCK_CHAIN_ID,
  name: 'USD Coin',
  symbol: 'USDC',
  iconUrl: 'https://example.com/usdc.png',
  tokenSupported: true,
  decimals: 6,
  ...overrides,
});

const mockTokenNetworkInfo = {
  networkName: 'Ethereum Mainnet',
  networkImageSource: { uri: 'https://example.com/eth.png' },
};

const mockGetTokenNetworkInfo = jest.fn(() => mockTokenNetworkInfo);
const mockGetRampsBuildQuoteNavbarOptions = jest.fn(
  (_navigation: unknown, _options: unknown) => ({}),
);

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    setOptions: mockSetOptions,
    goBack: mockGoBack,
    setParams: mockSetParams,
  }),
  useRoute: () => ({
    params: {
      assetId: MOCK_ASSET_ID,
    },
  }),
  useFocusEffect: (callback: () => void) => {
    mockUseEffect(() => callback(), [callback]);
  },
}));

const mockUseParams = jest.fn<Record<string, unknown>, []>(() => ({
  assetId: MOCK_ASSET_ID,
}));

jest.mock('../../../../../util/navigation/navUtils', () => ({
  ...jest.requireActual('../../../../../util/navigation/navUtils'),
  useParams: () => mockUseParams(),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
  I18nEvents: {
    addListener: jest.fn(),
  },
}));

jest.mock('../../../Navbar', () => ({
  getRampsBuildQuoteNavbarOptions: (navigation: unknown, options: unknown) =>
    mockGetRampsBuildQuoteNavbarOptions(navigation, options),
}));

jest.mock('../../../../hooks/useFormatters', () => ({
  useFormatters: () => ({
    formatCurrency: (amount: number) => `$${amount}`,
  }),
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => mockGetTokenNetworkInfo,
}));

const mockUseRampAccountAddress = jest.fn<string | undefined, [unknown?]>(
  (_chainId?: unknown) => '0x1234567890abcdef',
);

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: (chainId: unknown) => mockUseRampAccountAddress(chainId),
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: number) => value,
}));

jest.mock(
  '../../../../../component-library/components/BottomSheets/BottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return ReactActual.forwardRef(
      (
        {
          children,
          testID,
        }: {
          children: React.ReactNode;
          testID?: string;
        },
        ref: React.Ref<{ onCloseBottomSheet: () => void }>,
      ) => {
        ReactActual.useImperativeHandle(ref, () => ({
          onCloseBottomSheet: jest.fn(),
        }));
        return <View testID={testID}>{children}</View>;
      },
    );
  },
);

interface MockUserRegion {
  country: {
    currency: string;
    quickAmounts: number[];
    defaultAmount?: number;
  };
  state: null;
  regionCode: string;
}

const defaultUserRegion: MockUserRegion = {
  country: {
    currency: 'USD',
    quickAmounts: [50, 100, 200, 400],
  },
  state: null,
  regionCode: 'us',
};

let mockUserRegion: MockUserRegion | null = defaultUserRegion;
let mockSelectedProvider: unknown = null;
let mockSelectedPaymentMethod: unknown = null;
let mockProviders: { id: string; name: string }[] = [];
let mockPaymentMethods: { id: string; name: string }[] = [];
let mockProvidersLoading = false;
let mockPaymentMethodsLoading = false;
const mockSetSelectedProvider = jest.fn();
const mockSetSelectedPaymentMethod = jest.fn();
let mockSelectedQuote: Record<string, unknown> | null = null;
let mockTokens: {
  allTokens: ReturnType<typeof createMockToken>[];
  topTokens: ReturnType<typeof createMockToken>[];
} | null = {
  allTokens: [createMockToken()],
  topTokens: [createMockToken()],
};

let mockQuotesData: {
  success: Record<string, unknown>[];
  sorted: unknown[];
  error: unknown[];
  customActions: unknown[];
} | null = null;
let mockQuotesLoading = false;
let mockQuotesError: string | null = null;

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    userRegion: mockUserRegion,
    providers: mockProviders,
    selectedProvider: mockSelectedProvider,
    setSelectedProvider: mockSetSelectedProvider,
    paymentMethods: mockPaymentMethods,
    setSelectedPaymentMethod: mockSetSelectedPaymentMethod,
    selectedToken: mockTokens?.allTokens?.[0] ?? null,
    getWidgetUrl: mockGetWidgetUrl,
    paymentMethodsLoading: mockPaymentMethodsLoading,
    selectedPaymentMethod: mockSelectedPaymentMethod,
    providersLoading: mockProvidersLoading,
  }),
}));

jest.mock('../../hooks/useRampsQuotes', () => ({
  useRampsQuotes: () => ({
    data: mockQuotesData,
    loading: mockQuotesLoading,
    error: mockQuotesError,
  }),
}));

const mockTransakCheckExistingToken = jest.fn();
const mockTransakGetBuyQuote = jest.fn();

jest.mock('../../hooks/useTransakController', () => ({
  useTransakController: () => ({
    checkExistingToken: mockTransakCheckExistingToken,
    getBuyQuote: mockTransakGetBuyQuote,
  }),
}));

const mockTransakRouteAfterAuth = jest.fn();

jest.mock('../../hooks/useTransakRouting', () => ({
  useTransakRouting: () => ({
    routeAfterAuthentication: mockTransakRouteAfterAuth,
  }),
}));

jest.mock('../NativeFlow/EnterEmail', () => ({
  createV2EnterEmailNavDetails: (params: unknown) => ['RampEnterEmail', params],
}));

const renderWithTheme = (component: React.ReactElement) =>
  render(
    <ThemeContext.Provider value={mockTheme}>
      {component}
    </ThemeContext.Provider>,
  );

describe('BuildQuote', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseParams.mockImplementation(() => ({
      assetId: MOCK_ASSET_ID,
    }));
    jest
      .spyOn(InteractionManager, 'runAfterInteractions')
      .mockImplementation((task) => {
        if (typeof task === 'function') {
          task();
        } else if (task?.gen) {
          task.gen();
        }
        return { done: true, cancel: jest.fn() } as unknown as ReturnType<
          typeof InteractionManager.runAfterInteractions
        >;
      });
    mockUserRegion = defaultUserRegion;
    mockSelectedProvider = null;
    mockSelectedPaymentMethod = null;
    mockProviders = [];
    mockPaymentMethods = [];
    mockProvidersLoading = false;
    mockPaymentMethodsLoading = false;
    mockQuotesData = null;
    mockQuotesLoading = false;
    mockQuotesError = null;
    mockTokens = {
      allTokens: [createMockToken()],
      topTokens: [createMockToken()],
    };
    mockGetTokenNetworkInfo.mockReturnValue(mockTokenNetworkInfo);
    mockTransakCheckExistingToken.mockResolvedValue(false);
    mockTransakGetBuyQuote.mockResolvedValue(null);
    mockTransakRouteAfterAuth.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('displays initial amount as $100', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('$100')).toBeOnTheScreen();
  });

  it('displays region default amount when user has not entered amount and userRegion has defaultAmount', () => {
    mockUserRegion = {
      ...defaultUserRegion,
      country: {
        ...defaultUserRegion.country,
        defaultAmount: 250,
      },
    };

    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('$250')).toBeOnTheScreen();
  });

  it('applies suggested amount from route params', () => {
    mockUseParams.mockReturnValue({
      assetId: MOCK_ASSET_ID,
      amount: '175',
    });

    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('$175')).toBeOnTheScreen();
  });

  it('preselects provider from route params when available', () => {
    const intendedProvider = { id: '/providers/transak', name: 'Transak' };
    mockUseParams.mockReturnValue({
      assetId: MOCK_ASSET_ID,
      providerId: intendedProvider.id,
    });
    mockProviders = [intendedProvider];

    renderWithTheme(<BuildQuote />);

    expect(mockSetSelectedProvider).toHaveBeenCalledWith(intendedProvider);
  });

  it('preselects payment method from route params when available', () => {
    const intendedProvider = { id: '/providers/transak', name: 'Transak' };
    const intendedPaymentMethod = {
      id: '/payments/debit-credit-card',
      name: 'Card',
    };
    mockUseParams.mockReturnValue({
      assetId: MOCK_ASSET_ID,
      providerId: intendedProvider.id,
      paymentMethodId: intendedPaymentMethod.id,
    });
    mockProviders = [intendedProvider];
    mockSelectedProvider = intendedProvider;
    mockPaymentMethods = [intendedPaymentMethod];

    renderWithTheme(<BuildQuote />);

    expect(mockSetSelectedPaymentMethod).toHaveBeenCalledWith(
      intendedPaymentMethod,
    );
  });

  it('renders the keypad', () => {
    const { getByText, getByTestId } = renderWithTheme(<BuildQuote />);

    // Check keypad digits are rendered
    expect(getByText('1')).toBeOnTheScreen();
    expect(getByText('2')).toBeOnTheScreen();
    expect(getByText('3')).toBeOnTheScreen();
    expect(getByText('4')).toBeOnTheScreen();
    expect(getByText('5')).toBeOnTheScreen();
    expect(getByText('6')).toBeOnTheScreen();
    expect(getByText('7')).toBeOnTheScreen();
    expect(getByText('8')).toBeOnTheScreen();
    expect(getByText('9')).toBeOnTheScreen();
    expect(getByText('0')).toBeOnTheScreen();
    expect(getByTestId('keypad-delete-button')).toBeOnTheScreen();
  });

  it('updates amount when keypad digit is pressed', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('5'));

    expect(getByText('$1005')).toBeOnTheScreen();
  });

  it('updates amount with multiple digit presses', () => {
    const { getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByText('3'));

    expect(getByText('$100123')).toBeOnTheScreen();
  });

  it('deletes last digit when delete button is pressed', () => {
    const { getByText, getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByText('1'));
    fireEvent.press(getByText('2'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(getByText('$1001')).toBeOnTheScreen();
  });

  it('sets navigation options with token and network data', () => {
    renderWithTheme(<BuildQuote />);

    expect(mockGetRampsBuildQuoteNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        goBack: mockGoBack,
      }),
      expect.objectContaining({
        tokenName: 'USD Coin',
        tokenSymbol: 'USDC',
        tokenIconUrl: 'https://example.com/usdc.png',
        networkName: 'Ethereum Mainnet',
        networkImageSource: { uri: 'https://example.com/eth.png' },
        onSettingsPress: expect.any(Function),
      }),
    );
  });

  it('renders the payment method pill', () => {
    const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

    expect(getByTestId('payment-method-pill')).toBeOnTheScreen();
    expect(getByText('fiat_on_ramp.select_payment_method')).toBeOnTheScreen();
  });

  it('navigates to payment selection modal when payment method pill is pressed', () => {
    const { getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('payment-method-pill'));

    expect(mockNavigate).toHaveBeenCalledWith(
      'RampModals',
      expect.objectContaining({
        screen: 'RampPaymentSelectionModal',
      }),
    );
  });

  it('sets navigation options with undefined values when token is not found (shows skeleton)', () => {
    mockTokens = {
      allTokens: [],
      topTokens: [],
    };

    renderWithTheme(<BuildQuote />);

    expect(mockGetRampsBuildQuoteNavbarOptions).toHaveBeenCalledWith(
      expect.objectContaining({
        navigate: mockNavigate,
        setOptions: mockSetOptions,
        goBack: mockGoBack,
      }),
      expect.objectContaining({
        tokenName: undefined,
        tokenSymbol: undefined,
        tokenIconUrl: undefined,
        networkName: undefined,
        networkImageSource: undefined,
        onSettingsPress: expect.any(Function),
      }),
    );
  });

  it('renders quick amount buttons when amount is zero', () => {
    const { getByText, getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(getByText('$50')).toBeOnTheScreen();
    expect(getByText('$100')).toBeOnTheScreen();
    expect(getByText('$200')).toBeOnTheScreen();
    expect(getByText('$400')).toBeOnTheScreen();
  });

  it('does not render quick amount buttons when no quick amounts are available', () => {
    mockUserRegion = {
      country: {
        currency: 'USD',
        quickAmounts: [],
      },
      state: null,
      regionCode: 'us',
    };

    const { getByTestId, queryByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(queryByTestId('quick-amounts')).toBeNull();
  });

  it('updates amount when quick amount button is pressed', () => {
    const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('quick-amounts-button-100'));

    expect(getByText('$100')).toBeOnTheScreen();
  });

  it('hides quick amounts and shows continue button when amount is entered', () => {
    const { getByTestId, getByText, queryByTestId } = renderWithTheme(
      <BuildQuote />,
    );

    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));
    fireEvent.press(getByTestId('keypad-delete-button'));

    expect(getByTestId('quick-amounts')).toBeOnTheScreen();
    expect(queryByTestId('build-quote-continue-button')).toBeNull();

    fireEvent.press(getByText('5'));

    expect(queryByTestId('quick-amounts')).toBeNull();
    expect(getByTestId('build-quote-continue-button')).toBeOnTheScreen();
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<BuildQuote />);

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Continue button', () => {
    it('displays error banner when quote fetch fails', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesError = 'Network error';

      const { toJSON, getByText } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Network error')).toBeOnTheScreen();
      expect(toJSON()).toMatchSnapshot();
    });

    it('disables continue button when no quote is selected', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('disables continue button when quotes are loading', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesLoading = true;

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('disables continue button when quote provider does not match selected provider', async () => {
      const mockQuoteForOtherProvider = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuoteForOtherProvider],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const disabledButton = getByTestId('build-quote-continue-button');
      expect(disabledButton).toBeDisabled();
    });

    it('enables continue button when quote is selected and matches amount', async () => {
      const mockQuote = {
        provider: '/providers/transak',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/transak/buy-widget',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();
    });

    it('navigates to checkout webview for aggregator provider with URL', async () => {
      const mockQuote = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://global.transak.com/?apiKey=test',
          providerName: 'Mercuryo',
          providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
        }),
      );
    });

    it('passes userAgent to Checkout when quote has providerInfo.features.buy.userAgent', async () => {
      const mockQuoteWithUserAgent = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
          features: {
            buy: {
              userAgent: 'CustomProvider/1.0 (MetaMask)',
            },
          },
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuoteWithUserAgent],
        sorted: [],
        error: [],
        customActions: [],
      };
      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://global.transak.com/?apiKey=test',
          providerName: 'Mercuryo',
          userAgent: 'CustomProvider/1.0 (MetaMask)',
          providerType: FIAT_ORDER_PROVIDERS.RAMPS_V2,
        }),
      );
    });

    it('navigates to enter email for native provider when no existing token', async () => {
      mockTransakCheckExistingToken.mockResolvedValue(false);

      const mockNativeQuote = {
        provider: '/providers/transak-native',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/transak-native',
          name: 'Transak Native',
          type: 'native',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak-native',
        name: 'Transak Native',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockNativeQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockTransakCheckExistingToken).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        'RampEnterEmail',
        expect.objectContaining({
          amount: '100',
          currency: 'USD',
        }),
      );
    });

    it('routes after authentication for native provider when existing token found', async () => {
      const mockBuyQuote = { quoteId: 'q1', fiatAmount: 100 };
      mockTransakCheckExistingToken.mockResolvedValue(true);
      mockTransakGetBuyQuote.mockResolvedValue(mockBuyQuote);
      mockTransakRouteAfterAuth.mockResolvedValue(undefined);

      const mockNativeQuote = {
        provider: '/providers/transak-native',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/transak-native',
          name: 'Transak Native',
          type: 'native',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak-native',
        name: 'Transak Native',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockNativeQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockTransakCheckExistingToken).toHaveBeenCalled();
      expect(mockTransakGetBuyQuote).toHaveBeenCalledWith(
        'USD',
        MOCK_ASSET_ID,
        MOCK_CHAIN_ID,
        '/payments/debit-credit-card',
        '100',
      );
      expect(mockTransakRouteAfterAuth).toHaveBeenCalledWith(mockBuyQuote);
    });

    it('logs error when native provider flow fails', async () => {
      const mockLogger = jest.spyOn(Logger, 'error');
      mockTransakCheckExistingToken.mockRejectedValue(
        new Error('Token check failed'),
      );

      const mockNativeQuote = {
        provider: '/providers/transak-native',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/transak-native',
          name: 'Transak Native',
          type: 'native',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak-native',
        name: 'Transak Native',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockNativeQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          message: 'Failed to route native provider flow',
        }),
      );
    });

    it('logs error when aggregator provider has no URL', async () => {
      const mockLogger = jest.spyOn(Logger, 'error');
      mockGetWidgetUrl.mockResolvedValue(null);

      const mockQuote = {
        provider: '/providers/mercuryo',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          provider: '/providers/mercuryo',
        }),
      );
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('does not navigate when quote amount does not match current amount', async () => {
      const mockQuoteWrongAmount = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 50,
          amountOut: 0.025,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuoteWrongAmount],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
    });

    it('does not navigate when quote payment method does not match selected payment method', async () => {
      const mockQuoteWrongPaymentMethod = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/paypal',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuoteWrongPaymentMethod],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
    });

    it('does not navigate when quote has payment method but selectedPaymentMethod is missing', async () => {
      const mockQuote = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = null;
      mockQuotesData = {
        success: [mockQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
    });

    it('logs error when getWidgetUrl throws', async () => {
      const mockLogger = jest.spyOn(Logger, 'error');
      mockGetWidgetUrl.mockRejectedValue(new Error('Widget URL fetch failed'));

      const mockQuote = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockLogger).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          provider: '/providers/mercuryo',
          message: 'Failed to fetch widget URL',
        }),
      );
    });

    it('does nothing when selectedQuote is null on continue press', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
      expect(mockTransakCheckExistingToken).not.toHaveBeenCalled();
    });

    it('navigates to checkout when continue button is pressed', async () => {
      mockSelectedQuote = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockSelectedQuote],
        sorted: [],
        error: [],
        customActions: [],
      };
      mockGetWidgetUrl.mockResolvedValue('https://example.com/widget');

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('extracts provider code from path format in aggregator quote', async () => {
      mockSelectedQuote = {
        provider: '/providers/mercuryo',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/mercuryo/buy-widget',
        },
        providerInfo: {
          id: '/providers/mercuryo',
          name: 'Mercuryo',
          type: 'aggregator',
        },
      };
      mockSelectedProvider = {
        id: '/providers/mercuryo',
        name: 'Mercuryo',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockSelectedQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          providerCode: 'mercuryo',
        }),
      );
    });

    it('displays native flow error banner when error is set', () => {
      mockUseParams.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText } = renderWithTheme(<BuildQuote />);

      expect(getByText('Something went wrong')).toBeOnTheScreen();
    });

    it('clears native flow error when amount changes', () => {
      mockUseParams.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText, getByTestId, queryByText } = renderWithTheme(
        <BuildQuote />,
      );

      expect(getByText('Something went wrong')).toBeOnTheScreen();

      // Clear the params so the useEffect doesn't re-set the error
      mockUseParams.mockReturnValue({
        assetId: MOCK_ASSET_ID,
      });

      act(() => {
        fireEvent.press(getByTestId('keypad-delete-button'));
        fireEvent.press(getByTestId('keypad-delete-button'));
        fireEvent.press(getByTestId('keypad-delete-button'));
        fireEvent.press(getByText('5'));
      });

      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('clears native flow error when amount changes via keypad', () => {
      mockUseParams.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText, queryByText } = renderWithTheme(<BuildQuote />);

      expect(getByText('Something went wrong')).toBeOnTheScreen();

      // Clear the params so the useEffect doesn't re-set the error
      mockUseParams.mockReturnValue({
        assetId: MOCK_ASSET_ID,
      });

      act(() => {
        fireEvent.press(getByText('5'));
      });

      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('displays error message when native flow fails with unknown error', async () => {
      mockTransakCheckExistingToken.mockRejectedValue('Network error');

      mockSelectedQuote = {
        provider: '/providers/transak-native',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/transak-native',
          name: 'Transak Native',
          type: 'native',
        },
      };
      mockSelectedProvider = {
        id: '/providers/transak-native',
        name: 'Transak Native',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockQuotesData = {
        success: [mockSelectedQuote],
        sorted: [],
        error: [],
        customActions: [],
      };

      const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await flushPromises();
      });

      expect(getByText('Network error')).toBeOnTheScreen();
    });

    it('does not render continue button when amount is zero', () => {
      const { getByTestId, queryByTestId } = renderWithTheme(<BuildQuote />);

      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));

      expect(queryByTestId('build-quote-continue-button')).toBeNull();
    });

    it('continue button is disabled when payment method is not selected', () => {
      mockSelectedPaymentMethod = null;

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      expect(getByTestId('build-quote-continue-button')).toBeDisabled();
    });

    it('continue button is disabled when wallet address is missing', () => {
      mockUseRampAccountAddress.mockReturnValue(undefined);

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      expect(getByTestId('build-quote-continue-button')).toBeDisabled();
    });

    it('does not navigate to payment selection when amount is zero', () => {
      const { getByTestId } = renderWithTheme(<BuildQuote />);

      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));

      mockNavigate.mockClear();

      fireEvent.press(getByTestId('payment-method-pill'));

      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Token unavailable for provider', () => {
    it('navigates to token unavailable modal when token is not supported by provider', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
        environmentType: 'PRODUCTION',
        description: 'Test Provider',
        hqAddress: '123 Test St',
        links: [],
        logos: { light: '', dark: '', height: 24, width: 79 },
        supportedCryptoCurrencies: {
          'eip155:1/slip44:60': true,
        },
      };

      renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
          params: { assetId: MOCK_ASSET_ID },
        }),
      );
    });

    it('does not navigate to token unavailable modal when token is supported by provider', () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
        environmentType: 'PRODUCTION',
        description: 'Test Provider',
        hqAddress: '123 Test St',
        links: [],
        logos: { light: '', dark: '', height: 24, width: 79 },
        supportedCryptoCurrencies: {
          [MOCK_ASSET_ID]: true,
        },
      };

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('does not navigate to token unavailable modal when provider has no supportedCryptoCurrencies', () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
        environmentType: 'PRODUCTION',
        description: 'Test Provider',
        hqAddress: '123 Test St',
        links: [],
        logos: { light: '', dark: '', height: 24, width: 79 },
      };

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('does not navigate to token unavailable modal when no provider is selected', () => {
      mockSelectedProvider = null;

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });

    it('does not re-navigate to token unavailable modal on re-renders', async () => {
      mockSelectedProvider = {
        id: '/providers/transak',
        name: 'Transak',
        environmentType: 'PRODUCTION',
        description: 'Test Provider',
        hqAddress: '123 Test St',
        links: [],
        logos: { light: '', dark: '', height: 24, width: 79 },
        supportedCryptoCurrencies: {
          'eip155:1/slip44:60': true,
        },
      };

      const { rerender } = renderWithTheme(<BuildQuote />);

      await act(async () => {
        await flushPromises();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
          params: { assetId: MOCK_ASSET_ID },
        }),
      );

      mockNavigate.mockClear();

      rerender(
        <ThemeContext.Provider value={mockTheme}>
          <BuildQuote />
        </ThemeContext.Provider>,
      );

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RampModals',
        expect.objectContaining({
          screen: 'RampTokenNotAvailableModal',
        }),
      );
    });
  });
});
