import React from 'react';
import { fireEvent, render, act } from '@testing-library/react-native';
import BuildQuote from './BuildQuote';
import { ThemeContext, mockTheme } from '../../../../../util/theme';
import type { UseRampsQuotesResult } from '../../hooks/useRampsQuotes';
import type { RampsToken } from '../../hooks/useRampTokens';
import type { CaipChainId } from '@metamask/utils';
import Logger from '../../../../../util/Logger';

const mockUseEffect = jest.requireActual('react').useEffect;

const mockNavigate = jest.fn();
const mockSetOptions = jest.fn();
const mockGoBack = jest.fn();
const mockStartQuotePolling = jest.fn();
const mockStopQuotePolling = jest.fn();
const mockGetWidgetUrl = jest.fn<
  ReturnType<UseRampsQuotesResult['getWidgetUrl']>,
  Parameters<UseRampsQuotesResult['getWidgetUrl']>
>(async (quote) => {
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

jest.mock('../../utils/formatCurrency', () => ({
  formatCurrency: (amount: number) => `$${amount}`,
}));

jest.mock('../../hooks/useTokenNetworkInfo', () => ({
  useTokenNetworkInfo: () => mockGetTokenNetworkInfo,
}));

const mockUseRampAccountAddress = jest.fn<string | null, [chainId?: unknown]>(
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
let mockQuotes: unknown = null;
let mockQuotesLoading = false;
let mockQuotesError: string | null = null;
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
    quotes: mockQuotes,
    quotesLoading: mockQuotesLoading,
    quotesError: mockQuotesError,
    startQuotePolling: mockStartQuotePolling,
    stopQuotePolling: mockStopQuotePolling,
    getWidgetUrl: mockGetWidgetUrl,
    paymentMethodsLoading: false,
    selectedPaymentMethod: mockSelectedPaymentMethod,
  }),
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
    mockQuotes = null;
    mockQuotesLoading = false;
    mockQuotesError = null;
    mockSelectedPaymentMethod = null;
    mockTokens = {
      allTokens: [createMockToken()],
      topTokens: [createMockToken()],
    };
    mockGetTokenNetworkInfo.mockReturnValue(mockTokenNetworkInfo);
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
        }),
      );
    });

    it('navigates to deposit flow for native provider', () => {
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
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('Deposit', {
        screen: 'DepositRoot',
        params: {
          assetId: MOCK_ASSET_ID,
          amount: '100',
          currency: 'USD',
          shouldRouteImmediately: true,
        },
      });
    });

    it('navigates to deposit flow for native provider when ID does not end with -native (uses metadata)', () => {
      mockSelectedQuote = {
        provider: '/providers/whitelabel-in-app',
        url: null,
        quote: {
          amountIn: 100,
          amountOut: 0.05,
          paymentMethod: '/payments/debit-credit-card',
        },
        providerInfo: {
          id: '/providers/whitelabel-in-app',
          name: 'Whitelabel',
          type: 'native',
        },
      };
      mockSelectedProvider = {
        id: '/providers/whitelabel-in-app',
        name: 'Whitelabel',
      };
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      const { getByTestId } = renderWithTheme(<BuildQuote />);

      const continueButton = getByTestId('build-quote-continue-button');
      fireEvent.press(continueButton);

      expect(mockNavigate).toHaveBeenCalledWith('Deposit', {
        screen: 'DepositRoot',
        params: {
          assetId: MOCK_ASSET_ID,
          amount: '100',
          currency: 'USD',
          shouldRouteImmediately: true,
        },
      });
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
      // Now navigates to error modal instead of doing nothing
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'widget_url_missing',
            isCritical: false,
          }),
        }),
      );

      mockLogger.mockRestore();
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

    it('shows loading state while fetching widget URL', async () => {
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

      let resolveGetWidgetUrl: (value: string | null) => void;
      const widgetUrlPromise = new Promise<string | null>((resolve) => {
        resolveGetWidgetUrl = resolve;
      });
      mockGetWidgetUrl.mockReturnValue(widgetUrlPromise);

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      expect(continueButton.props.accessibilityState?.disabled).toBe(false);

      await act(async () => {
        fireEvent.press(continueButton);
      });

      expect(continueButton.props.accessibilityState?.disabled).toBe(true);

      await act(async () => {
        resolveGetWidgetUrl('https://global.transak.com/?apiKey=test');
        await widgetUrlPromise;
      });

      expect(mockNavigate).toHaveBeenCalled();
    });

    it('clears loading state after navigation error', async () => {
      const mockLogger = jest.spyOn(Logger, 'error');
      mockGetWidgetUrl.mockRejectedValue(new Error('Network error'));

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

      expect(mockLogger).toHaveBeenCalled();
      expect(continueButton.props.accessibilityState?.disabled).toBe(false);

      mockLogger.mockRestore();
    });

    it('prevents double-tap during navigation', async () => {
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

      let resolveGetWidgetUrl: (value: string | null) => void;
      const widgetUrlPromise = new Promise<string | null>((resolve) => {
        resolveGetWidgetUrl = resolve;
      });
      mockGetWidgetUrl.mockReturnValue(widgetUrlPromise);

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      // Fire both presses in the same act so no render runs between them.
      // This verifies the useRef guard prevents re-entry before React flushes setIsNavigating.
      await act(async () => {
        fireEvent.press(continueButton);
        fireEvent.press(continueButton);
      });

      await act(async () => {
        resolveGetWidgetUrl('https://global.transak.com/?apiKey=test');
        await widgetUrlPromise;
      });

      expect(mockGetWidgetUrl).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    it('navigates to error modal when quote fetch fails', () => {
      mockQuotesError = 'Failed to fetch quotes';

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'quote_fetch',
            isCritical: false,
          }),
        }),
      );
    });

    it('navigates to error modal when no quotes are available', () => {
      mockQuotes = {
        success: [],
        sorted: [],
        error: [],
      };
      mockQuotesLoading = false;

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'no_quotes',
            isCritical: false,
          }),
        }),
      );
    });

    it('navigates to error modal when getWidgetUrl returns null', async () => {
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

      mockGetWidgetUrl.mockResolvedValue(null);

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'widget_url_missing',
            isCritical: false,
          }),
        }),
      );
    });

    it('navigates to error modal when getWidgetUrl throws an error', async () => {
      const mockLogger = jest.spyOn(Logger, 'error');
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

      mockGetWidgetUrl.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      expect(mockLogger).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'widget_url_failed',
            isCritical: false,
          }),
        }),
      );

      mockLogger.mockRestore();
    });

    it('does not navigate to error modal when quotes are loading', () => {
      mockQuotes = {
        success: [],
        sorted: [],
        error: [],
      };
      mockQuotesLoading = true;

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
        }),
      );
    });

    it('does not trigger navigation multiple times for persistent no_quotes condition', () => {
      mockQuotes = {
        success: [],
        sorted: [],
        error: [],
      };
      mockQuotesLoading = false;

      renderWithTheme(<BuildQuote />);

      // Should navigate to error modal exactly once
      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'no_quotes',
          }),
        }),
      );

      // Even though useEffect may run multiple times during initial render,
      // navigation should only be called once
    });

    it('clears error state when quotes become available after no_quotes error', () => {
      mockQuotes = {
        success: [],
        sorted: [],
        error: [],
      };
      mockQuotesLoading = false;

      const { rerender } = renderWithTheme(<BuildQuote />);

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'no_quotes',
          }),
        }),
      );

      mockNavigate.mockClear();

      // Now quotes become available
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
      mockQuotes = {
        success: [mockSelectedQuote],
        sorted: [mockSelectedQuote],
        error: [],
      };

      rerender(<BuildQuote />);

      // Should not navigate to error modal since quotes are now available
      expect(mockNavigate).not.toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
        }),
      );
    });
  });

  describe('Error Retry Handling', () => {
    it('passes onRetry callback to error modal for all error types', () => {
      mockQuotesError = 'Failed to fetch quotes';

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'quote_fetch',
            onRetry: expect.any(Function),
          }),
        }),
      );
    });

    it('does not retry quote polling when wallet address is missing', () => {
      mockQuotesError = 'Failed to fetch quotes';
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };
      mockUseRampAccountAddress.mockReturnValue(null);

      renderWithTheme(<BuildQuote />);

      const onRetry = mockNavigate.mock.calls[0][1].params.onRetry;

      mockStartQuotePolling.mockClear();

      act(() => {
        onRetry();
      });

      expect(mockStartQuotePolling).not.toHaveBeenCalled();

      mockUseRampAccountAddress.mockReturnValue('0x1234567890abcdef');
    });

    it('does not retry quote polling when payment method is missing', () => {
      mockQuotesError = 'Failed to fetch quotes';
      mockSelectedPaymentMethod = null;

      renderWithTheme(<BuildQuote />);

      const onRetry = mockNavigate.mock.calls[0][1].params.onRetry;

      mockStartQuotePolling.mockClear();

      act(() => {
        onRetry();
      });

      expect(mockStartQuotePolling).not.toHaveBeenCalled();
    });

    it('navigates back when retrying no_quotes error', () => {
      mockQuotes = {
        success: [],
        sorted: [],
        error: [],
      };
      mockQuotesLoading = false;
      mockSelectedPaymentMethod = {
        id: '/payments/debit-credit-card',
        name: 'Card',
      };

      renderWithTheme(<BuildQuote />);

      expect(mockNavigate).toHaveBeenCalledWith(
        'RootModalFlow',
        expect.objectContaining({
          screen: 'RampErrorModal',
          params: expect.objectContaining({
            errorType: 'no_quotes',
            onRetry: expect.any(Function),
          }),
        }),
      );

      const onRetry = mockNavigate.mock.calls[0][1].params.onRetry;

      mockGoBack.mockClear();

      act(() => {
        onRetry();
      });

      expect(mockGoBack).toHaveBeenCalledTimes(1);
    });

    it('does nothing when retrying widget_url_failed error', async () => {
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

      mockGetWidgetUrl.mockRejectedValue(new Error('Network error'));

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      const onRetry =
        mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][1].params
          .onRetry;

      mockNavigate.mockClear();
      mockGoBack.mockClear();
      mockStartQuotePolling.mockClear();

      act(() => {
        onRetry();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockStartQuotePolling).not.toHaveBeenCalled();
    });

    it('does nothing when retrying widget_url_missing error', async () => {
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

      mockGetWidgetUrl.mockResolvedValue(null);

      const { getByTestId } = renderWithTheme(<BuildQuote />);
      const continueButton = getByTestId('build-quote-continue-button');

      await act(async () => {
        fireEvent.press(continueButton);
      });

      await act(async () => {
        await Promise.resolve();
      });

      const onRetry =
        mockNavigate.mock.calls[mockNavigate.mock.calls.length - 1][1].params
          .onRetry;

      mockNavigate.mockClear();
      mockGoBack.mockClear();
      mockStartQuotePolling.mockClear();

      act(() => {
        onRetry();
      });

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockGoBack).not.toHaveBeenCalled();
      expect(mockStartQuotePolling).not.toHaveBeenCalled();
    });
  });
});
