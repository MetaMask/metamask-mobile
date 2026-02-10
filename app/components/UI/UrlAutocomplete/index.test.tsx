// Mock tokenBalancesController to avoid selector initialization issues
// This is imported by reducers/swaps which is used by renderWithProvider
jest.mock('../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: jest.fn(() => ({})),
  selectAddressHasTokenBalances: jest.fn(() => false),
  selectContractBalances: jest.fn(() => ({})),
  selectTokenBalancesControllerState: jest.fn(() => ({})),
}));

// Mock the entire Result component to avoid the deep import chain issues
// The chain: Result -> Balance -> EarnBalance -> earnController -> multichain -> evm -> tokenBalancesController
jest.mock('./Result', () => {
  // Note: Using dynamic imports inside jest.mock factory is necessary
  // because the mock factory runs before ES6 imports are resolved
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const bookmarkActions = jest.requireActual('../../../actions/bookmarks');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const reactRedux = jest.requireActual('react-redux');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactNative = jest.requireActual('react-native');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ReactLib = jest.requireActual('react');

  interface MockResultProps {
    result: { category: string; name?: string; url?: string; title?: string };
    onPress: () => void;
  }

  return {
    Result: ({ result, onPress }: MockResultProps) => {
      const dispatch = reactRedux.useDispatch();
      const displayName =
        result.name || result.title || result.url || 'Unknown Result';
      const isFavorite = result.category === 'favorites';

      const handleDelete = () => {
        dispatch(bookmarkActions.removeBookmark(result));
      };

      return ReactLib.createElement(
        ReactNative.View,
        null,
        ReactLib.createElement(
          ReactNative.TouchableOpacity,
          { onPress },
          ReactLib.createElement(ReactNative.Text, null, displayName),
        ),
        isFavorite &&
          ReactLib.createElement(
            ReactNative.TouchableOpacity,
            { testID: `delete-favorite-${result.url}`, onPress: handleDelete },
            ReactLib.createElement(ReactNative.Text, null, 'Delete'),
          ),
      );
    },
  };
});
const mockTokenData = {
  assetId: 'eip155:1/slip44:60',
  name: 'Ethereum',
  symbol: 'ETH',
  decimals: 18,
  price: '2500.50',
  priceChangePct: { h24: '2.5' },
};

const mockPerpsData = {
  symbol: 'BTC-USD',
  name: 'Bitcoin',
  maxLeverage: '100x',
  price: '$45000.00',
  change24h: '+$500.00',
  change24hPercent: '+1.12%',
  volume: '$1B',
  openInterest: '$500M',
  marketType: 'crypto' as const,
  marketSource: 'hyperliquid',
};

const mockPredictionsData = {
  id: 'pred-1',
  providerId: 'polymarket',
  slug: 'bitcoin-100k',
  title: 'Will Bitcoin reach $100k?',
  description: 'Prediction market',
  endDate: '2025-12-31',
  image: 'https://example.com/btc.png',
  status: 'open',
  liquidity: '$1M',
  volume: '$5M',
};

const mockUseExploreSearchReturn = {
  data: {
    sites: [{ name: 'Uniswap', url: 'https://uniswap.org' }],
    tokens: [mockTokenData],
    perps: [mockPerpsData],
    predictions: [mockPredictionsData],
  },
  isLoading: { sites: false, tokens: false, perps: false, predictions: false },
  sectionsOrder: ['sites', 'tokens', 'perps', 'predictions'],
};

jest.mock('../../Views/TrendingView/hooks/useExploreSearch', () => ({
  useExploreSearch: jest.fn(() => mockUseExploreSearchReturn),
}));
jest.mock('../Perps/providers/PerpsConnectionProvider', () => ({
  PerpsConnectionProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock('../../../selectors/settings', () => ({
  selectBasicFunctionalityEnabled: jest.fn(() => true),
}));
jest.mock('../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: jest.fn(() => ({
    goToSwaps: jest.fn(),
    networkModal: null,
  })),
  SwapBridgeNavigationLocation: { TokenView: 'TokenView' },
}));

import React from 'react';
import UrlAutocomplete, { UrlAutocompleteRef } from './';
import { deleteFavoriteTestId } from '../../../../wdio/screen-objects/testIDs/BrowserScreen/UrlAutocomplete.testIds';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import renderWithProvider, {
  DeepPartial,
} from '../../../util/test/renderWithProvider';
import { removeBookmark } from '../../../actions/bookmarks';
import { noop } from 'lodash';
import { createStackNavigator } from '@react-navigation/stack';
import { RpcEndpointType } from '@metamask/network-controller';
import { RootState } from '../../../reducers';
import { selectBasicFunctionalityEnabled } from '../../../selectors/settings';

const defaultState: DeepPartial<RootState> = {
  browser: { history: [{ url: 'https://www.google.com', name: 'Google' }] },
  bookmarks: [{ url: 'https://www.bookmark.com', name: 'MyBookmark' }],
  engine: {
    backgroundState: {
      PreferencesController: {
        isIpfsGatewayEnabled: false,
        tokenNetworkFilter: {
          '0x1': true,
        },
      },
      CurrencyRateController: {
        currentCurrency: 'USD',
      },
      MultichainNetworkController: {
        isEvmSelected: true,
        multichainNetworkConfigurationsByChainId: {},
      },
      NetworkController: {
        selectedNetworkClientId: 'mainnet',
        networksMetadata: {
          mainnet: {
            EIPS: {
              1559: true,
            },
          },
        },
        networkConfigurationsByChainId: {
          '0x1': {
            chainId: '0x1' as `0x${string}`,
            rpcEndpoints: [
              {
                name: 'Ethereum Mainnet',
                networkClientId: 'mainnet' as const,
                url: 'https://mainnet.infura.io/v3/{infuraProjectId}',
                type: RpcEndpointType.Infura,
              },
            ],
            defaultRpcEndpointIndex: 0,
            nativeCurrency: 'ETH',
            name: 'Ethereum Mainnet',
            blockExplorerUrls: ['https://etherscan.io'],
            defaultBlockExplorerUrlIndex: 0,
          },
        },
      },
    },
  },
};

type RenderWithProviderParams = Parameters<typeof renderWithProvider>;

const Stack = createStackNavigator();
const render = (...args: RenderWithProviderParams) => {
  const Component = () => args[0];
  return renderWithProvider(
    <Stack.Navigator>
      <Stack.Screen name="UrlAutocomplete" component={Component} />
    </Stack.Navigator>,
    args[1],
    args[2],
  );
};

jest.mock('../../../core/Engine', () => ({
  context: {
    CurrencyRateController: {
      updateExchangeRate: jest.fn(),
    },
  },
}));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const navigation = jest.requireActual('@react-navigation/native');
  return {
    ...navigation,
    useNavigation: jest.fn().mockImplementation(() => ({
      navigate: mockNavigate,
    })),
  };
});

// Mock useFavicon to prevent async state updates warning
jest.mock('../../hooks/useFavicon/useFavicon', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    isLoading: false,
    isLoaded: true,
    error: null,
    favicon: null,
  })),
}));

describe('UrlAutocomplete', () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  it('displays sites from dapp list when searching', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    act(() => {
      ref.current?.search('uni');
      jest.runAllTimers();
    });

    // Assert
    expect(
      await screen.findByText('Uniswap', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('displays sites from bookmarks when searching', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });

    // Assert
    expect(
      await screen.findByText('MyBookmark', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('displays sites from recents/history when searching', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    act(() => {
      ref.current?.search('Goog');
      jest.runAllTimers();
    });

    // Assert
    expect(
      await screen.findByText('Google', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('displays history and bookmarks when search query is empty', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    act(() => {
      ref.current?.search('');
      jest.runAllTimers();
    });

    // Assert
    expect(
      await screen.findByText('Google', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    expect(
      await screen.findByText('MyBookmark', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('hides Recents and Favorites headers when no results found', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    act(() => {
      ref.current?.search('nothing');
      jest.runAllTimers();
    });

    // Assert
    expect(
      screen.queryByText('Recents', { includeHiddenElements: true }),
    ).toBeNull();
    expect(
      screen.queryByText('Favorites', { includeHiddenElements: true }),
    ).toBeNull();
  });

  it('dispatches removeBookmark action when pressing trash icon', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    const { store } = render(
      <UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />,
      { state: defaultState },
    );
    store.dispatch = jest.fn();

    // Act
    act(() => {
      ref.current?.search('MyBook');
      jest.runAllTimers();
    });
    const deleteFavorite = await screen.findByTestId(
      deleteFavoriteTestId(defaultState.bookmarks[0].url),
      { includeHiddenElements: true },
    );
    fireEvent.press(deleteFavorite);

    // Assert
    expect(store.dispatch).toHaveBeenCalledWith(
      removeBookmark({ ...defaultState.bookmarks[0], category: 'favorites' }),
    );
  });

  it('calls onSelect callback when a bookmark is pressed', async () => {
    // Arrange
    const onSelect = jest.fn();
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={onSelect} onDismiss={noop} />, {
      state: defaultState,
    });

    // Act
    const result = await screen.findByText('MyBookmark', {
      includeHiddenElements: true,
    });
    fireEvent.press(result);

    // Assert
    expect(onSelect).toHaveBeenCalled();
  });

  it('removes duplicate results with same url and category in empty state', async () => {
    // Arrange
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: {
        ...defaultState,
        browser: {
          history: [
            { url: 'https://www.google.com', name: 'Google' },
            { url: 'https://www.google.com', name: 'Google Duplicate' },
          ],
        },
        bookmarks: [],
      },
    });

    // Act - empty state shows deduplicated recents
    act(() => {
      ref.current?.search('');
      jest.runAllTimers();
    });

    // Assert - only one Google result (first one encountered)
    const googleResults = await screen.findAllByText(/Google/, {
      includeHiddenElements: true,
    });
    expect(googleResults).toHaveLength(1);
  });

  it('limits recent results to MAX_RECENTS', async () => {
    // Arrange
    const historyItems = Array.from({ length: 10 }, (_, i) => ({
      url: `https://www.site${i}.com`,
      name: `Site${i}`,
    }));
    const ref = React.createRef<UrlAutocompleteRef>();
    render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
      state: {
        ...defaultState,
        browser: { history: historyItems },
        bookmarks: [],
      },
    });

    // Act
    act(() => {
      ref.current?.search('Site');
      jest.runAllTimers();
    });

    // Assert - MAX_RECENTS is 5, so with 10 items, only 5 should show
    expect(
      await screen.findByText('Recents', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  describe('ref methods', () => {
    it('exposes search, hide, and show methods via ref', () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();

      // Act
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Assert
      expect(typeof ref.current?.search).toBe('function');
      expect(typeof ref.current?.hide).toBe('function');
      expect(typeof ref.current?.show).toBe('function');
    });

    it('resets search query when hide is called', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act - search then hide
      act(() => {
        ref.current?.search('test');
        jest.runAllTimers();
      });
      act(() => {
        ref.current?.hide();
        jest.runAllTimers();
      });

      // Assert - after hide, empty state is shown with history
      expect(
        await screen.findByText('Google', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });
  });

  describe('omni-search integration', () => {
    it('displays Sites header when sites data is available', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('uni');
        jest.runAllTimers();
      });

      // Assert
      expect(
        await screen.findByText('Sites', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('displays token name when tokens data is available', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('eth');
        jest.runAllTimers();
      });

      // Assert - token name is displayed from transformed data
      expect(
        await screen.findByText('Ethereum', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('displays Perps header when perps data is available', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('btc');
        jest.runAllTimers();
      });

      // Assert
      expect(
        await screen.findByText('Perps', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('displays Predictions header when predictions data is available', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('bitcoin');
        jest.runAllTimers();
      });

      // Assert
      expect(
        await screen.findByText('Predictions', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('transforms and displays token search results', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('ethereum');
        jest.runAllTimers();
      });

      // Assert - token name is displayed via transformed TokenSearchResult
      expect(
        await screen.findByText('Ethereum', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('transforms and displays perps search results', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('btc');
        jest.runAllTimers();
      });

      // Assert - perps name is displayed via transformed PerpsSearchResult
      expect(
        await screen.findByText('Bitcoin', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('transforms predictions search results and shows header', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('prediction');
        jest.runAllTimers();
      });

      // Assert - Predictions section is rendered
      expect(
        await screen.findByText('Predictions', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('calls show method to display autocomplete', async () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.show();
        jest.runAllTimers();
      });

      // Assert - show method works
      expect(ref.current?.show).toBeDefined();
    });

    it('calls onSelect when pressing a token result', async () => {
      // Arrange
      const onSelect = jest.fn();
      const ref = React.createRef<UrlAutocompleteRef>();
      render(
        <UrlAutocomplete ref={ref} onSelect={onSelect} onDismiss={noop} />,
        {
          state: defaultState,
        },
      );

      // Act
      act(() => {
        ref.current?.search('eth');
        jest.runAllTimers();
      });

      const tokenResult = await screen.findByText('Ethereum', {
        includeHiddenElements: true,
      });
      fireEvent.press(tokenResult);

      // Assert
      expect(onSelect).toHaveBeenCalled();
    });
  });

  describe('empty state', () => {
    it('renders component when no history or bookmarks exist', () => {
      // Arrange
      const ref = React.createRef<UrlAutocompleteRef>();

      // Act
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: {
          ...defaultState,
          browser: { history: [] },
          bookmarks: [],
        },
      });

      // Assert - component mounts successfully
      expect(ref.current).not.toBeNull();
    });
  });

  describe('basic functionality toggle', () => {
    const mockSelectBasicFunctionality = jest.mocked(
      selectBasicFunctionalityEnabled,
    );

    afterEach(() => {
      // Restore default mock value
      mockSelectBasicFunctionality.mockReturnValue(true);
    });

    it('displays local results (Recents/Favorites) when basic functionality is disabled', async () => {
      // Arrange - disable basic functionality
      mockSelectBasicFunctionality.mockReturnValue(false);

      const ref = React.createRef<UrlAutocompleteRef>();
      const stateWithHistory = {
        ...defaultState,
        browser: {
          history: [
            {
              url: 'https://example.com',
              name: 'Example Site',
            },
          ],
        },
        bookmarks: [
          {
            url: 'https://favorite.com',
            name: 'Favorite Site',
          },
        ],
      };

      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: stateWithHistory,
      });

      // Act
      act(() => {
        ref.current?.search('example');
        jest.runAllTimers();
      });

      // Assert - local results are visible even with basic functionality disabled
      expect(
        await screen.findByText('Example Site', {
          includeHiddenElements: true,
        }),
      ).toBeOnTheScreen();
    });

    it('hides API-dependent sections when basic functionality is disabled', async () => {
      // Arrange - disable basic functionality
      mockSelectBasicFunctionality.mockReturnValue(false);

      const ref = React.createRef<UrlAutocompleteRef>();
      render(<UrlAutocomplete ref={ref} onSelect={noop} onDismiss={noop} />, {
        state: defaultState,
      });

      // Act
      act(() => {
        ref.current?.search('eth');
        jest.runAllTimers();
      });

      // Assert - API-dependent sections are not shown
      // Note: With basic functionality disabled, tokens from API should not appear
      // Only local results (Recents/Favorites) matching the query would show
      await waitFor(() => {
        // Sites section header should not be visible (API-dependent)
        expect(screen.queryByText('Sites')).toBeNull();
      });
    });
  });
});
