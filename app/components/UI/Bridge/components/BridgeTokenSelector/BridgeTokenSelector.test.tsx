import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CaipChainId } from '@metamask/utils';
import {
  createMockToken,
  createMockPopularToken,
  MOCK_CHAIN_IDS,
} from '../../testUtils/fixtures';
import { BridgeTokenSelector } from './BridgeTokenSelector';
import { tokenToIncludeAsset } from '../../utils/tokenUtils';
import { BridgeToken } from '../../types';

let mockBridgeFeatureFlags = {
  chainRanking: [
    { chainId: MOCK_CHAIN_IDS.ethereum },
    { chainId: MOCK_CHAIN_IDS.polygon },
  ],
};

// Create a Redux store with all the state needed by the component
const createMockStore = () =>
  configureStore({
    reducer: {
      user: () => ({ appTheme: 'light' }),
      engine: () => ({
        backgroundState: {
          NetworkController: {
            networkConfigurationsByChainId: {
              '0x1': { name: 'Ethereum Mainnet', chainId: '0x1' },
              '0x89': { name: 'Polygon', chainId: '0x89' },
            },
          },
          NetworkEnablementController: {
            enabledNetworkMap: {
              eip155: {
                '0x1': true,
                '0x89': true,
              },
            },
          },
          BridgeController: {
            bridgeState: {
              bridgeFeatureFlags: mockBridgeFeatureFlags,
            },
          },
        },
      }),
      bridge: () => ({
        sourceToken: null,
        destToken: null,
      }),
    },
  });

const mockStore = createMockStore();

// Helper function to render with Redux Provider
const renderWithReduxProvider = (component: React.ReactElement) =>
  render(<Provider store={mockStore}>{component}</Provider>);

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
let mockRouteParams: { type: 'source' | 'dest' } = { type: 'source' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: jest.fn(),
    setOptions: mockSetOptions,
  }),
  useRoute: () => ({ params: mockRouteParams }),
}));

// Mock selectors to return test data
jest.mock('../../../../../selectors/networkController', () => ({
  selectNetworkConfigurations: jest.fn(() => ({
    '0x1': { name: 'Ethereum Mainnet', chainId: '0x1' },
    '0x89': { name: 'Polygon', chainId: '0x89' },
  })),
}));

// Use a getter to access mockBridgeFeatureFlags at runtime (after variable is defined)
// This is needed because jest.mock is hoisted before variable declarations
jest.mock('../../../../../core/redux/slices/bridge', () => {
  // Access the variable from the outer scope via module exports hack
  const getMockBridgeFeatureFlags = () =>
    // This is evaluated when the selector is called, not when the mock is defined
    ({
      chainRanking: [{ chainId: 'eip155:1' }, { chainId: 'eip155:137' }],
    });
  return {
    selectBridgeFeatureFlags: jest.fn(() => getMockBridgeFeatureFlags()),
    selectSourceChainRanking: jest.fn(
      () => getMockBridgeFeatureFlags().chainRanking,
    ),
    selectDestChainRanking: jest.fn(
      () => getMockBridgeFeatureFlags().chainRanking,
    ),
    setIsSelectingToken: jest.fn(() => ({
      type: 'bridge/setIsSelectingToken',
    })),
  };
});

let mockPopularTokensState = {
  popularTokens: [createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' })],
  isLoading: false,
};
jest.mock('../../hooks/usePopularTokens', () => ({
  usePopularTokens: () => mockPopularTokensState,
}));

const mockSearchTokens = jest.fn();
const mockDebouncedSearch = Object.assign(jest.fn(), { cancel: jest.fn() });
const mockResetSearch = jest.fn();
let mockSearchTokensState = {
  searchResults: [] as ReturnType<typeof createMockPopularToken>[],
  isSearchLoading: false,
  isLoadingMore: false,
  searchCursor: undefined as string | undefined,
  currentSearchQuery: '',
  searchTokens: mockSearchTokens,
  debouncedSearch: mockDebouncedSearch,
  resetSearch: mockResetSearch,
};
jest.mock('../../hooks/useSearchTokens', () => ({
  useSearchTokens: () => mockSearchTokensState,
}));

let mockBalancesByAssetIdState = {
  tokensWithBalance: [] as ReturnType<typeof createMockToken>[],
  balancesByAssetId: {},
};
jest.mock('../../hooks/useBalancesByAssetId', () => ({
  useBalancesByAssetId: () => mockBalancesByAssetIdState,
}));

jest.mock('../../hooks/useTokensWithBalances', () => ({
  useTokensWithBalances: (tokens: Record<string, unknown>[]) =>
    tokens.map((token) => ({
      ...token,
      address: (token as { address?: string }).address ?? '0x1234',
      chainId: (token as { chainId?: string }).chainId ?? '0x1',
    })),
}));

const mockHandleTokenPress = jest.fn();
let mockSelectedToken: ReturnType<typeof createMockToken> | null = null;
jest.mock('../../hooks/useTokenSelection', () => ({
  useTokenSelection: () => ({
    handleTokenPress: mockHandleTokenPress,
    selectedToken: mockSelectedToken,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));
jest.mock(
  '../../../../../component-library/components-temp/HeaderCenter',
  () => ({
    getHeaderCenterNavbarOptions: jest.fn(() => ({})),
  }),
);

const mockTrackEvent = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        trackUnifiedSwapBridgeEvent: (...args: unknown[]) =>
          mockTrackEvent(...args),
      },
    },
  },
}));

jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      buttonContainer: {},
      searchInput: {},
      tokensList: {},
      tokensListContainer: {},
    },
  }),
}));

const mockFormatAddressToAssetId = jest.fn(() => 'eip155:1/erc20:0x1234');
const mockIsNonEvmChainId = jest.fn(() => false);
jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: (...args: unknown[]) =>
    mockFormatAddressToAssetId(...args),
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
  isNonEvmChainId: (...args: unknown[]) => mockIsNonEvmChainId(...args),
  UnifiedSwapBridgeEventName: {
    AssetDetailTooltipClicked: 'AssetDetailTooltipClicked',
  },
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (...args: unknown[]) => mockIsNonEvmChainId(...args),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    Box: ({ children, style }: { children: React.ReactNode; style?: object }) =>
      createElement(View, { style }, children),
    Text: 'Text',
    ButtonIcon: ({ onPress }: { onPress?: () => void }) =>
      createElement(TouchableOpacity, { onPress, testID: 'button-icon-info' }),
    ButtonIconSize: { Md: 'Md' },
    IconColor: { IconAlternative: 'IconAlternative' },
    IconName: { Info: 'Info' },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => ({ style: (...args: unknown[]) => args }),
}));
jest.mock('../../../../../constants/bridge', () => ({
  NETWORK_TO_SHORT_NETWORK_NAME_MAP: {
    'eip155:1': 'Ethereum',
    '0x1': 'Ethereum',
    'eip155:137': 'Polygon',
    '0x89': 'Polygon',
  },
}));
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'https://network.png' })),
}));

jest.mock('./NetworkPills', () => ({
  NetworkPills: ({
    onChainSelect,
  }: {
    onChainSelect: (chainId?: CaipChainId) => void;
  }) => {
    const { createElement } = jest.requireActual('react');
    const { View, TouchableOpacity } = jest.requireActual('react-native');
    return createElement(
      View,
      { testID: 'network-pills' },
      createElement(TouchableOpacity, {
        testID: 'select-eth-network',
        onPress: () => onChainSelect(MOCK_CHAIN_IDS.ethereum),
      }),
    );
  },
}));

jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { createElement } = jest.requireActual('react');
    const { TextInput, TouchableOpacity, View } =
      jest.requireActual('react-native');
    return ({
      onChangeText,
      testID,
      value,
      showClearButton,
      onPressClearButton,
    }: {
      onChangeText: (text: string) => void;
      testID: string;
      value?: string;
      showClearButton?: boolean;
      onPressClearButton?: () => void;
    }) =>
      createElement(
        View,
        null,
        createElement(TextInput, { onChangeText, testID, value }),
        showClearButton &&
          createElement(TouchableOpacity, {
            testID: 'bridge-token-search-clear-button',
            onPress: onPressClearButton,
          }),
      );
  },
);

jest.mock('../BridgeTokenSelectorBase', () => ({
  SkeletonItem: () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return createElement(View, { testID: 'skeleton-item' });
  },
}));

jest.mock('../TokenSelectorItem', () => ({
  TokenSelectorItem: ({
    token,
    onPress,
    children,
  }: {
    token: { symbol: string; address: string; chainId: string };
    onPress: (token: {
      symbol: string;
      address: string;
      chainId: string;
    }) => void;
    children?: React.ReactNode;
  }) => {
    const { createElement } = jest.requireActual('react');
    const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
    return createElement(
      TouchableOpacity,
      { onPress: () => onPress(token), testID: `token-${token.symbol}` },
      createElement(Text, null, token.symbol),
      createElement(View, null, children),
    );
  },
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
jest.mock('react-native-gesture-handler', () => {
  const { FlatList, ScrollView } = jest.requireActual('react-native');
  return { FlatList, ScrollView };
});

const resetMocks = () => {
  mockRouteParams = { type: 'source' };
  mockBridgeFeatureFlags = {
    chainRanking: [
      { chainId: MOCK_CHAIN_IDS.ethereum },
      { chainId: MOCK_CHAIN_IDS.polygon },
    ],
  };
  mockPopularTokensState = {
    popularTokens: [
      createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' }),
    ],
    isLoading: false,
  };
  mockSearchTokensState = {
    searchResults: [],
    isSearchLoading: false,
    isLoadingMore: false,
    searchCursor: undefined,
    currentSearchQuery: '',
    searchTokens: mockSearchTokens,
    debouncedSearch: mockDebouncedSearch,
    resetSearch: mockResetSearch,
  };
  mockBalancesByAssetIdState = { tokensWithBalance: [], balancesByAssetId: {} };
  mockSelectedToken = null;
  mockFormatAddressToAssetId.mockReturnValue('eip155:1/erc20:0x1234');
  mockIsNonEvmChainId.mockReturnValue(false);
};

const createTestToken = (
  overrides: Partial<BridgeToken> = {},
): BridgeToken => ({
  address: '0x1234567890123456789012345678901234567890',
  symbol: 'TEST',
  decimals: 18,
  chainId: '0x1',
  name: 'Test Token',
  ...overrides,
});

describe('tokenToIncludeAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatAddressToAssetId.mockReturnValue('eip155:1/erc20:0x1234');
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  it('returns null when formatAddressToAssetId returns null', () => {
    mockFormatAddressToAssetId.mockReturnValue(null);
    const token = createTestToken();

    const result = tokenToIncludeAsset(token);

    expect(result).toBeNull();
  });

  it('returns IncludeAsset with lowercase assetId for EVM token', () => {
    mockFormatAddressToAssetId.mockReturnValue('EIP155:1/ERC20:0xABCD');
    mockIsNonEvmChainId.mockReturnValue(false);
    const token = createTestToken({
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    });

    const result = tokenToIncludeAsset(token);

    expect(result).toEqual({
      assetId: 'eip155:1/erc20:0xabcd',
      name: 'USD Coin',
      symbol: 'USDC',
      decimals: 6,
    });
  });

  it('returns IncludeAsset with preserved assetId case for non-EVM token', () => {
    mockFormatAddressToAssetId.mockReturnValue(
      'bip122:000000000019d6689c085ae165831e93/slip44:0',
    );
    mockIsNonEvmChainId.mockReturnValue(true);
    const token = createTestToken({
      symbol: 'BTC',
      name: 'Bitcoin',
      decimals: 8,
      chainId: 'bip122:000000000019d6689c085ae165831e93',
    });

    const result = tokenToIncludeAsset(token);

    expect(result).toEqual({
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    });
  });

  it('uses empty string for undefined token name', () => {
    const token = createTestToken({ name: undefined });

    const result = tokenToIncludeAsset(token);

    expect(result).not.toBeNull();
    expect(result?.name).toBe('');
  });
});

const createSearchToken = (symbol: string) =>
  createMockPopularToken({
    assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}` as never,
    symbol,
  });

describe('BridgeTokenSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('rendering', () => {
    it('renders and sets navigation options', () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      expect(getByTestId('bridge-token-search-input')).toBeTruthy();
      expect(mockSetOptions).toHaveBeenCalled();
    });

    it('renders skeleton items during loading', async () => {
      mockPopularTokensState = { popularTokens: [], isLoading: true };
      const { getAllByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      await waitFor(() => {
        expect(getAllByTestId('skeleton-item').length).toBe(8);
      });
    });

    it('renders footer skeleton when loading more', async () => {
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('ETH')],
        isLoadingMore: true,
      };
      const { getAllByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      await waitFor(() =>
        expect(getAllByTestId('skeleton-item').length).toBeGreaterThan(0),
      );
    });

    it('renders noFee tokens for source and dest types', async () => {
      mockPopularTokensState = {
        popularTokens: [
          {
            ...createMockPopularToken({ symbol: 'USDC' }),
            noFee: { isSource: true, isDestination: true },
          } as never,
        ],
        isLoading: false,
      };
      const { getByTestId, rerender } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      mockRouteParams = { type: 'dest' };
      rerender(
        <Provider store={mockStore}>
          <BridgeTokenSelector />
        </Provider>,
      );
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
    });
  });

  describe('search', () => {
    it('triggers debounced search on text change', () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      expect(mockDebouncedSearch).toHaveBeenCalledWith('ETH');
    });

    it('displays search results when query meets minimum length', async () => {
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH')],
        currentSearchQuery: 'WET',
      };
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
      await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());
    });

    it('clears search when clear button is pressed', async () => {
      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      await waitFor(() =>
        expect(getByTestId('bridge-token-search-clear-button')).toBeTruthy(),
      );

      await act(async () => {
        fireEvent.press(getByTestId('bridge-token-search-clear-button'));
      });

      expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
      expect(mockResetSearch).toHaveBeenCalled();
      await waitFor(() =>
        expect(queryByTestId('bridge-token-search-clear-button')).toBeNull(),
      );
    });
  });

  describe('token selection', () => {
    it('calls handleTokenPress when token pressed', async () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      fireEvent.press(getByTestId('token-USDC'));
      expect(mockHandleTokenPress).toHaveBeenCalled();
    });

    it('handles dest route type with selected token', async () => {
      mockRouteParams = { type: 'dest' };
      mockSelectedToken = createMockToken({ symbol: 'USDC', chainId: '0x1' });
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
    });
  });

  describe('chain selection', () => {
    it('cancels search and resets when chain changes', async () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      await act(async () => {
        fireEvent.press(getByTestId('select-eth-network'));
      });
      expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
      expect(mockResetSearch).toHaveBeenCalled();
    });

    it('returns empty chain array when chainRanking unavailable', () => {
      mockBridgeFeatureFlags = { chainRanking: undefined as never };
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      expect(getByTestId('bridge-token-search-input')).toBeTruthy();
    });
  });

  describe('pagination', () => {
    it('triggers load more on scroll near bottom with cursor', async () => {
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH')],
        searchCursor: 'next-cursor',
        currentSearchQuery: 'WET',
      };
      const { getByTestId, UNSAFE_getByType } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
      await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());
      mockSearchTokens.mockClear();
      const { FlatList } = jest.requireActual('react-native');
      await act(async () => {
        UNSAFE_getByType(FlatList).props.onScroll({
          nativeEvent: {
            layoutMeasurement: { height: 500 },
            contentOffset: { y: 750 },
            contentSize: { height: 1000 },
          },
        });
      });
      expect(mockSearchTokens).toHaveBeenCalledWith('WET', 'next-cursor');
    });

    it.each([
      ['cursor unavailable', { searchCursor: undefined }, { y: 800 }],
      ['not near bottom', { searchCursor: 'cursor' }, { y: 100 }],
      [
        'isSearchLoading',
        { searchCursor: 'cursor', isSearchLoading: true },
        { y: 800 },
      ],
      [
        'isLoadingMore',
        { searchCursor: 'cursor', isLoadingMore: true },
        { y: 800 },
      ],
    ])(
      'does not load more when %s',
      async (_, stateOverrides, scrollOffset) => {
        mockSearchTokensState = {
          ...mockSearchTokensState,
          searchResults: [createSearchToken('WETH')],
          currentSearchQuery: 'WET',
          ...stateOverrides,
        };
        const { getByTestId, UNSAFE_getByType } = renderWithReduxProvider(
          <BridgeTokenSelector />,
        );
        fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
        mockSearchTokens.mockClear();
        const { FlatList } = jest.requireActual('react-native');
        await act(async () => {
          UNSAFE_getByType(FlatList).props.onScroll({
            nativeEvent: {
              layoutMeasurement: { height: 500 },
              contentOffset: scrollOffset,
              contentSize: { height: 2000 },
            },
          });
        });
        expect(mockSearchTokens).not.toHaveBeenCalled();
      },
    );
  });

  describe('navigation and tracking', () => {
    it('navigates and tracks event on info button press', async () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      await act(async () => {
        fireEvent.press(getByTestId('button-icon-info'));
      });
      expect(mockNavigate).toHaveBeenCalledWith(
        'Asset',
        expect.objectContaining({
          symbol: 'USDC',
          name: 'USD Coin',
          assetId: 'eip155:1/erc20:0x1234567890123456789012345678901234567890',
          chainId: 'eip155:1',
          decimals: 18,
          image: 'https://example.com/token.png',
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
