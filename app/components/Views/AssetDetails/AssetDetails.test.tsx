import React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import AssetDetails from './index';
import renderWithProvider from '../../../util/test/renderWithProvider';
import { backgroundState } from '../../../util/test/initial-root-state';
import {
  MOCK_ACCOUNTS_CONTROLLER_STATE,
  MOCK_ADDRESS_2,
} from '../../../util/test/accountsControllerTestUtils';
import { mockNetworkState } from '../../../util/test/network';
import ClipboardManager from '../../../core/ClipboardManager';
import Routes from '../../../constants/navigation/Routes';
import { Hex } from '@metamask/utils';

// Mock dependencies
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
      goBack: mockGoBack,
    }),
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

const mockShowToast = jest.fn();
jest.mock('../../../component-library/components/Toast', () => ({
  ...jest.requireActual('../../../component-library/components/Toast'),
  ToastContext: {
    Provider: ({ children }: { children: React.ReactNode }) => children,
    Consumer: ({
      children,
    }: {
      children: (value: unknown) => React.ReactNode;
    }) =>
      children({
        toastRef: {
          current: {
            showToast: mockShowToast,
          },
        },
      }),
  },
}));

// Use the actual ToastContext
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useContext: jest.fn().mockImplementation((context) => {
    if (context.displayName === 'ToastContext') {
      return {
        toastRef: {
          current: {
            showToast: mockShowToast,
          },
        },
      };
    }
    return jest.requireActual('react').useContext(context);
  }),
}));

jest.mock('../../../core/Engine', () => ({
  context: {
    TokensController: {
      ignoreTokens: jest.fn().mockResolvedValue(undefined),
    },
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn().mockReturnValue('mainnet'),
    },
  },
}));

jest.mock('../../../core/NotificationManager', () => ({
  showSimpleNotification: jest.fn(),
}));

// Mock Perps hooks and selectors
const mockUsePerpsMarketForAsset = jest.fn();
jest.mock('../../UI/Perps/hooks/usePerpsMarketForAsset', () => ({
  usePerpsMarketForAsset: () => mockUsePerpsMarketForAsset(),
}));

const mockSelectPerpsEnabledFlag = jest.fn();
jest.mock('../../UI/Perps', () => ({
  selectPerpsEnabledFlag: () => mockSelectPerpsEnabledFlag(),
}));

// Mock useMetrics
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn();
const mockBuild = jest.fn();
const mockAddProperties = jest.fn(() => ({ build: mockBuild }));

jest.mock('../../hooks/useMetrics', () => ({
  useMetrics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const MOCK_CHAIN_ID = '0x1' as Hex;
const MOCK_TOKEN_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7' as Hex;

const mockToken = {
  address: MOCK_TOKEN_ADDRESS,
  symbol: 'USDT',
  decimals: 6,
  name: 'Tether USD',
  image: 'https://example.com/usdt.png',
  aggregators: ['CoinGecko', 'CoinMarketCap'],
  isNative: false,
  isETH: false,
};

const mockAsset = {
  ...mockToken,
  balance: '1000000',
  balanceFiat: '$1.00',
  chainId: MOCK_CHAIN_ID,
  hasBalanceError: false,
  logo: 'https://example.com/usdt.png',
};

const mockInitialState = {
  engine: {
    backgroundState: {
      ...backgroundState,
      NetworkController: {
        ...mockNetworkState({
          chainId: MOCK_CHAIN_ID,
          id: 'mainnet',
          nickname: 'Ethereum Mainnet',
          ticker: 'ETH',
          blockExplorerUrl: 'https://etherscan.io',
        }),
      },
      AccountsController: MOCK_ACCOUNTS_CONTROLLER_STATE,
      TokensController: {
        allTokens: {
          [MOCK_CHAIN_ID]: {
            [MOCK_ADDRESS_2]: [mockToken],
          },
        },
      },
      TokenBalancesController: {
        tokenBalances: {
          [MOCK_ADDRESS_2]: {
            [MOCK_CHAIN_ID]: {
              [MOCK_TOKEN_ADDRESS]: '1000000',
            },
          },
        },
      },
      TokenRatesController: {
        marketData: {
          [MOCK_CHAIN_ID]: {
            [MOCK_TOKEN_ADDRESS]: { price: 1 },
          },
        },
      },
      CurrencyRateController: {
        currencyRates: {
          ETH: {
            conversionDate: 1732572535.47,
            conversionRate: 3432.53,
            usdConversionRate: 3432.53,
          },
        },
        currentCurrency: 'usd',
      },
    },
  },
  settings: {
    primaryCurrency: 'ETH',
  },
};

const renderComponent = (customProps = {}) => {
  const defaultProps = {
    route: {
      params: {
        address: MOCK_TOKEN_ADDRESS,
        chainId: MOCK_CHAIN_ID,
        asset: mockAsset,
      },
    },
  };

  return renderWithProvider(
    <AssetDetails {...defaultProps} {...customProps} />,
    { state: mockInitialState },
  );
};

describe('AssetDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default Perps mock - disabled
    mockSelectPerpsEnabledFlag.mockReturnValue(false);
    mockUsePerpsMarketForAsset.mockReturnValue({
      hasPerpsMarket: false,
      marketData: null,
    });
    // Setup event builder chain
    mockBuild.mockReturnValue({ category: 'test' });
    mockCreateEventBuilder.mockReturnValue({
      addProperties: mockAddProperties,
    });
  });

  describe('Rendering', () => {
    it('renders token details correctly', () => {
      const { getByText } = renderComponent();

      // Should show token symbol
      expect(getByText(mockToken.symbol)).toBeTruthy();
    });

    it('renders network name', () => {
      const { getByText } = renderComponent();

      expect(getByText('Ethereum Mainnet')).toBeTruthy();
    });

    it('renders decimals', () => {
      const { getByText } = renderComponent();

      expect(getByText('6')).toBeTruthy();
    });

    it('renders aggregators when present', () => {
      const { getByText } = renderComponent();

      expect(getByText('CoinGecko, CoinMarketCap')).toBeTruthy();
    });

    it('returns null when token is not found', () => {
      const stateWithoutToken = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              allTokens: {},
            },
          },
        },
      };

      const { toJSON } = renderWithProvider(
        <AssetDetails
          route={{
            params: {
              address: '0xnonexistent' as Hex,
              chainId: MOCK_CHAIN_ID,
              asset: undefined as unknown as typeof mockAsset,
            },
          }}
        />,
        { state: stateWithoutToken },
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('Navigation', () => {
    it('calls goBack when back button is pressed', () => {
      const { getByRole } = renderComponent();

      const backButton = getByRole('button');
      fireEvent.press(backButton);

      expect(mockGoBack).toHaveBeenCalled();
    });
  });

  describe('Copy Address', () => {
    it('copies address to clipboard when pressed', async () => {
      const { getByText } = renderComponent();

      // Find the address element by partial text match
      const addressElement = getByText(/0xdac17/i);
      fireEvent.press(addressElement);

      await waitFor(() => {
        expect(ClipboardManager.setString).toHaveBeenCalledWith(
          MOCK_TOKEN_ADDRESS,
        );
      });
    });
  });

  describe('Hide Token', () => {
    it('navigates to hide confirmation when hide button is pressed', () => {
      const { getByText } = renderComponent();

      const hideButton = getByText('Hide token');
      fireEvent.press(hideButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        'AssetHideConfirmation',
        expect.objectContaining({
          onConfirm: expect.any(Function),
        }),
      );
    });
  });

  describe('Perps Discovery Banner', () => {
    const mockMarketData = {
      symbol: 'USDT',
      maxLeverage: 50,
    };

    it('does not render Perps banner when perps is disabled', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(false);
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: mockMarketData,
      });

      const { queryByTestId } = renderComponent();

      expect(queryByTestId('perps-discovery-banner')).toBeNull();
    });

    it('does not render Perps banner when no market exists', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: false,
        marketData: null,
      });

      const { queryByTestId } = renderComponent();

      expect(queryByTestId('perps-discovery-banner')).toBeNull();
    });

    it('renders Perps banner when perps is enabled and market exists for trustworthy token', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: mockMarketData,
      });

      // Token with sufficient aggregators is trustworthy
      const { getByTestId } = renderComponent();

      expect(getByTestId('perps-discovery-banner')).toBeTruthy();
    });

    it('navigates to market details when Perps banner is pressed', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: mockMarketData,
      });

      const { getByTestId } = renderComponent();

      const banner = getByTestId('perps-discovery-banner');
      fireEvent.press(banner);

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.MARKET_DETAILS, {
        market: mockMarketData,
        source: 'asset_detail_screen',
      });
    });

    it('does not render Perps banner for token with insufficient aggregators', () => {
      mockSelectPerpsEnabledFlag.mockReturnValue(true);
      mockUsePerpsMarketForAsset.mockReturnValue({
        hasPerpsMarket: true,
        marketData: mockMarketData,
      });

      // Token with no aggregators
      const tokenWithNoAggregators = {
        ...mockToken,
        aggregators: [],
      };

      const assetWithNoAggregators = {
        ...mockAsset,
        aggregators: [],
      };

      const stateWithUntrustworthyToken = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              allTokens: {
                [MOCK_CHAIN_ID]: {
                  [MOCK_ADDRESS_2]: [tokenWithNoAggregators],
                },
              },
            },
          },
        },
      };

      const { queryByTestId } = renderWithProvider(
        <AssetDetails
          route={{
            params: {
              address: MOCK_TOKEN_ADDRESS,
              chainId: MOCK_CHAIN_ID,
              asset: assetWithNoAggregators,
            },
          }}
        />,
        { state: stateWithUntrustworthyToken },
      );

      expect(queryByTestId('perps-discovery-banner')).toBeNull();
    });
  });

  describe('Token from Asset prop (trending/search)', () => {
    it('creates token from asset when not in portfolio', () => {
      const newTokenAsset = {
        ...mockAsset,
        address: '0xnewtoken' as Hex,
        symbol: 'NEW',
        decimals: 18,
        name: 'New Token',
        aggregators: [],
      };

      const stateWithoutToken = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokensController: {
              allTokens: {
                [MOCK_CHAIN_ID]: {
                  [MOCK_ADDRESS_2]: [], // No tokens in portfolio
                },
              },
            },
          },
        },
      };

      const { getByText } = renderWithProvider(
        <AssetDetails
          route={{
            params: {
              address: '0xnewtoken' as Hex,
              chainId: MOCK_CHAIN_ID,
              asset: newTokenAsset,
            },
          }}
        />,
        { state: stateWithoutToken },
      );

      // Should render with asset data
      expect(getByText('NEW')).toBeTruthy();
    });
  });

  describe('Balance Display', () => {
    it('renders token balance when available', () => {
      const { queryByText } = renderComponent();

      // Balance should be rendered (exact format depends on primaryCurrency setting)
      // With primaryCurrency: 'ETH', it shows balance first
      expect(queryByText(/1/)).toBeTruthy();
    });

    it('renders warning banner when balance cannot be loaded', () => {
      const stateWithNoBalance = {
        ...mockInitialState,
        engine: {
          ...mockInitialState.engine,
          backgroundState: {
            ...mockInitialState.engine.backgroundState,
            TokenBalancesController: {
              tokenBalances: {},
            },
            TokenRatesController: {
              marketData: {},
            },
          },
        },
      };

      const { getByText } = renderWithProvider(
        <AssetDetails
          route={{
            params: {
              address: MOCK_TOKEN_ADDRESS,
              chainId: MOCK_CHAIN_ID,
              asset: mockAsset,
            },
          }}
        />,
        { state: stateWithNoBalance },
      );

      // Warning message should be shown
      expect(getByText(/were unable/i)).toBeTruthy();
    });

    it('renders balance with fiat when primaryCurrency is fiat', () => {
      const stateWithFiatPrimary = {
        ...mockInitialState,
        settings: {
          primaryCurrency: 'Fiat',
        },
      };

      const { queryByText } = renderWithProvider(
        <AssetDetails
          route={{
            params: {
              address: MOCK_TOKEN_ADDRESS,
              chainId: MOCK_CHAIN_ID,
              asset: mockAsset,
            },
          }}
        />,
        { state: stateWithFiatPrimary },
      );

      // Should show balance in some format
      expect(queryByText(/1/)).toBeTruthy();
    });
  });
});
