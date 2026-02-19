import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { RampsToken } from '../../hooks/useRampTokens';
import type { CaipChainId } from '@metamask/utils';
import Logger from '../../../../../util/Logger';

const mockUseEffect = jest.requireActual('react').useEffect;

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockStartQuotePolling = jest.fn();
const mockStopQuotePolling = jest.fn();
const mockGetWidgetUrl = jest.fn(async (quote) => {
  const buyUrl = quote?.quote?.buyURL;
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

const mockUseRampAccountAddress = jest.fn(
  (_chainId?: unknown) => '0x1234567890abcdef',
);

jest.mock('../../hooks/useRampAccountAddress', () => ({
  __esModule: true,
  default: (chainId: unknown) => mockUseRampAccountAddress(chainId),
}));

jest.mock('../../../../hooks/useDebouncedValue', () => ({
  useDebouncedValue: (value: number) => value,
}));

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
let mockSelectedQuote: unknown = null;
let mockQuotesLoading = false;
let mockSelectedPaymentMethod: unknown = null;
let mockTokens: {
  allTokens: ReturnType<typeof createMockToken>[];
  topTokens: ReturnType<typeof createMockToken>[];
} | null = {
  allTokens: [createMockToken()],
  topTokens: [createMockToken()],
};

jest.mock('../../hooks/useRampsController', () => ({
  useRampsController: () => ({
    userRegion: mockUserRegion,
    selectedProvider: mockSelectedProvider,
    selectedToken: mockTokens?.allTokens?.[0] ?? null,
    selectedQuote: mockSelectedQuote,
    quotesLoading: mockQuotesLoading,
    startQuotePolling: mockStartQuotePolling,
    stopQuotePolling: mockStopQuotePolling,
    getWidgetUrl: mockGetWidgetUrl,
    paymentMethodsLoading: false,
    selectedPaymentMethod: mockSelectedPaymentMethod,
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

jest.mock('../Modals/ProviderPickerModal', () => ({
  createProviderPickerModalNavigationDetails: (params: unknown) => [
    'RampModals',
    { screen: 'RampProviderPickerModal', params },
  ],
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
    mockUserRegion = defaultUserRegion;
    mockSelectedProvider = null;
    mockSelectedQuote = null;
    mockQuotesLoading = false;
    mockSelectedPaymentMethod = null;
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

  it('displays powered by provider text when selected provider is set', () => {
    mockSelectedProvider = {
      id: '/providers/transak',
      name: 'Transak',
      environmentType: 'PRODUCTION',
      description: 'Test Provider',
      hqAddress: '123 Test St',
      links: [],
      logos: { light: '', dark: '', height: 24, width: 79 },
    };

    const { getByText } = renderWithTheme(<BuildQuote />);

    expect(getByText('fiat_on_ramp.powered_by_provider')).toBeOnTheScreen();
  });

  it('does not display powered by text when no selected provider is set', () => {
    mockSelectedProvider = null;

    const { queryByText } = renderWithTheme(<BuildQuote />);

    expect(queryByText('fiat_on_ramp.powered_by_provider')).toBeNull();
  });

  it('navigates to provider picker modal when powered by text is pressed', () => {
    mockSelectedProvider = {
      id: '/providers/transak',
      name: 'Transak',
      environmentType: 'PRODUCTION',
      description: 'Test Provider',
      hqAddress: '123 Test St',
      links: [],
      logos: { light: '', dark: '', height: 24, width: 79 },
    };

    const { getByTestId } = renderWithTheme(<BuildQuote />);

    fireEvent.press(getByTestId('provider-picker-trigger'));

    expect(mockStopQuotePolling).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('RampModals', {
      screen: 'RampProviderPickerModal',
      params: { assetId: MOCK_ASSET_ID },
    });
  });

  it('matches snapshot', () => {
    const { toJSON } = renderWithTheme(<BuildQuote />);

    expect(toJSON()).toMatchSnapshot();
  });

  describe('Continue button', () => {
    it('disables continue button when no quote is selected', () => {
      mockSelectedQuote = null;
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('disables continue button when quotes are loading', () => {
      mockQuotesLoading = true;
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).toBeDisabled();
    });

    it('enables continue button when quote is selected and matches amount', () => {
      mockSelectedQuote = {
        provider: '/providers/transak',
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
          buyURL:
            'https://on-ramp.uat-api.cx.metamask.io/providers/transak/buy-widget',
        },
        providerInfo: {
          id: '/providers/transak',
          name: 'Transak',
          type: 'aggregator',
        },
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      expect(continueButton).not.toBeDisabled();
    });

    it('navigates to checkout webview for aggregator provider with URL', async () => {
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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://global.transak.com/?apiKey=test',
          providerName: 'Mercuryo',
          providerType: 'AGGREGATOR',
        }),
      );
    });

    it('passes userAgent to Checkout when quote has providerInfo.features.buy.userAgent', async () => {
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
          features: {
            buy: {
              userAgent: 'CustomProvider/1.0 (MetaMask)',
            },
          },
        },
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          url: 'https://global.transak.com/?apiKey=test',
          providerName: 'Mercuryo',
          userAgent: 'CustomProvider/1.0 (MetaMask)',
          providerType: 'AGGREGATOR',
        }),
      );
    });

    it('navigates to enter email for native provider when no existing token', async () => {
      mockTransakCheckExistingToken.mockResolvedValue(false);

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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
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

      mockSelectedQuote = {
        provider: '/providers/mercuryo',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
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
      mockSelectedQuote = {
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
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
    });

    it('does not navigate when quote payment method does not match selected payment method', async () => {
      mockSelectedQuote = {
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
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
    });

    it('does not navigate when quote has payment method but selectedPaymentMethod is missing', async () => {
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
      mockSelectedPaymentMethod = null;

      const { getByTestId } = renderWithTheme(<BuildQuote />);

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
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
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
      mockSelectedQuote = null;
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGetWidgetUrl).not.toHaveBeenCalled();
      expect(mockTransakCheckExistingToken).not.toHaveBeenCalled();
    });

    it('shows loading state while continuing', async () => {
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
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      mockGetWidgetUrl.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve('url'), 100)),
      );

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      act(() => {
        fireEvent.press(continueButton);
      });

      expect(continueButton).toHaveProp('isLoading', true);
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

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      mockGetWidgetUrl.mockResolvedValue(
        'https://global.transak.com/?apiKey=test',
      );

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'Checkout',
        expect.objectContaining({
          providerCode: 'mercuryo',
        }),
      );
    });

    it('displays native flow error banner when error is set', () => {
      const useParamsMock = jest.requireMock<
        typeof import('../../../../../util/navigation/navUtils')
      >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

      useParamsMock.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText } = renderWithTheme(<BuildQuote />);

      expect(getByText('Something went wrong')).toBeOnTheScreen();
    });

    it('clears native flow error when amount changes', () => {
      const useParamsMock = jest.requireMock<
        typeof import('../../../../../util/navigation/navUtils')
      >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

      useParamsMock.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText, getByTestId, queryByText } = renderWithTheme(
        <BuildQuote />,
      );

      expect(getByText('Something went wrong')).toBeOnTheScreen();

      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByText('5'));

      expect(queryByText('Something went wrong')).toBeNull();
    });

    it('clears native flow error when quick amount is pressed', () => {
      const useParamsMock = jest.requireMock<
        typeof import('../../../../../util/navigation/navUtils')
      >('../../../../../util/navigation/navUtils').useParams as jest.Mock;

      useParamsMock.mockReturnValue({
        assetId: MOCK_ASSET_ID,
        nativeFlowError: 'Something went wrong',
      });

      const { getByText, getByTestId, queryByText } = renderWithTheme(
        <BuildQuote />,
      );

      expect(getByText('Something went wrong')).toBeOnTheScreen();

      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('quick-amounts-button-100'));

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

      const { getByTestId, getByText } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(getByText('deposit.buildQuote.unexpectedError')).toBeOnTheScreen();
    });

    it('does not start quote polling when amount is zero', () => {
      const { getByTestId } = renderWithTheme(<BuildQuote />);

      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));
      fireEvent.press(getByTestId('keypad-delete-button'));

      expect(mockStopQuotePolling).toHaveBeenCalled();
    });

    it('does not start quote polling when payment method is not selected', () => {
      mockSelectedPaymentMethod = null;

      renderWithTheme(<BuildQuote />);

      expect(mockStopQuotePolling).toHaveBeenCalled();
    });

    it('does not start quote polling when wallet address is missing', () => {
      mockUseRampAccountAddress.mockReturnValue(null);

      renderWithTheme(<BuildQuote />);

      expect(mockStopQuotePolling).toHaveBeenCalled();
    });

    it('stops quote polling when navigating away from screen', () => {
      const { unmount } = renderWithTheme(<BuildQuote />);

      unmount();

      expect(mockStopQuotePolling).toHaveBeenCalled();
    });

    it('stops quote polling when opening payment selection modal', () => {
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      fireEvent.press(getByTestId('payment-method-pill'));

      expect(mockStopQuotePolling).toHaveBeenCalled();
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
});
