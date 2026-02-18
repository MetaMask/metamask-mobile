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

let mockBridgeFeatureFlags = {
  chainRanking: [
    { chainId: MOCK_CHAIN_IDS.ethereum },
    { chainId: MOCK_CHAIN_IDS.polygon },
  ],
};

interface MockBridgeState {
  sourceToken: ReturnType<typeof createMockToken> | null;
  destToken: ReturnType<typeof createMockToken> | null;
  tokenSelectorNetworkFilter: CaipChainId | undefined;
  visiblePillChainIds: CaipChainId[] | undefined;
}

const defaultMockBridgeState: MockBridgeState = {
  sourceToken: null,
  destToken: null,
  tokenSelectorNetworkFilter: undefined,
  visiblePillChainIds: undefined,
};

// Create a Redux store with all the state needed by the component
const createMockStore = (bridgeStateOverrides: Partial<MockBridgeState> = {}) =>
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
      bridge: (
        state: MockBridgeState | undefined,
        action: { type: string; payload?: CaipChainId | CaipChainId[] },
      ) => {
        const resolvedState = state ?? {
          ...defaultMockBridgeState,
          ...bridgeStateOverrides,
        };

        if (action.type === 'bridge/setTokenSelectorNetworkFilter') {
          return {
            ...resolvedState,
            tokenSelectorNetworkFilter: action.payload as
              | CaipChainId
              | undefined,
          };
        }
        if (action.type === 'bridge/setVisiblePillChainIds') {
          return {
            ...resolvedState,
            visiblePillChainIds: action.payload as CaipChainId[] | undefined,
          };
        }
        return resolvedState;
      },
    },
  });

// Helper function to render with Redux Provider
const renderWithReduxProvider = (
  component: React.ReactElement,
  store = createMockStore(),
) => render(<Provider store={store}>{component}</Provider>);

const mockSetOptions = jest.fn();
const mockNavigate = jest.fn();
const mockNavigationDispatch = jest.fn();
let mockRouteParams: { type: 'source' | 'dest' } = { type: 'source' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockNavigationDispatch,
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
  const emptyChainRanking: CaipChainId[] = [];
  return {
    selectBridgeFeatureFlags: jest.fn(
      (state: {
        engine: {
          backgroundState: {
            BridgeController: { bridgeState: { bridgeFeatureFlags: unknown } };
          };
        };
      }) =>
        state.engine.backgroundState.BridgeController.bridgeState
          .bridgeFeatureFlags,
    ),
    selectAllowedChainRanking: jest.fn(
      (state: {
        engine: {
          backgroundState: {
            BridgeController: {
              bridgeState: {
                bridgeFeatureFlags?: { chainRanking?: CaipChainId[] };
              };
            };
          };
        };
      }) =>
        state.engine.backgroundState.BridgeController.bridgeState
          .bridgeFeatureFlags?.chainRanking ?? emptyChainRanking,
    ),
    setIsSelectingToken: jest.fn(() => ({
      type: 'bridge/setIsSelectingToken',
    })),
    selectTokenSelectorNetworkFilter: jest.fn(
      (state: { bridge: { tokenSelectorNetworkFilter?: CaipChainId } }) =>
        state.bridge.tokenSelectorNetworkFilter,
    ),
    setTokenSelectorNetworkFilter: jest.fn((chainId) => ({
      type: 'bridge/setTokenSelectorNetworkFilter',
      payload: chainId,
    })),
    setVisiblePillChainIds: jest.fn((chainIds) => ({
      type: 'bridge/setVisiblePillChainIds',
      payload: chainIds,
    })),
  };
});

let mockPopularTokensState = {
  popularTokens: [createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' })],
  isLoading: false,
};
const mockUsePopularTokens = jest.fn(() => mockPopularTokensState);
jest.mock('../../hooks/usePopularTokens', () => ({
  usePopularTokens: (params: unknown) => mockUsePopularTokens(params),
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
const mockUseSearchTokens = jest.fn(() => mockSearchTokensState);
jest.mock('../../hooks/useSearchTokens', () => ({
  useSearchTokens: (params: unknown) => mockUseSearchTokens(params),
}));

let mockBalancesByAssetIdState = {
  tokensWithBalance: [] as ReturnType<typeof createMockToken>[],
  balancesByAssetId: {},
};
const mockUseBalancesByAssetId = jest.fn(() => mockBalancesByAssetIdState);
jest.mock('../../hooks/useBalancesByAssetId', () => ({
  useBalancesByAssetId: (params: unknown) => mockUseBalancesByAssetId(params),
}));

jest.mock('../../hooks/useTokensWithBalances', () => ({
  useTokensWithBalances: (tokens: Record<string, unknown>[]) =>
    tokens.map((token) => {
      const { iconUrl, ...tokenWithoutIconUrl } = token as { iconUrl?: string };
      return {
        ...tokenWithoutIconUrl,
        address: (token as { address?: string }).address ?? '0x1234',
        chainId: (token as { chainId?: string }).chainId ?? '0x1',
        image: iconUrl, // Map API's iconUrl to BridgeToken's image
      };
    }),
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
  '../../../../../component-library/components-temp/HeaderCompactStandard',
  () => ({
    getHeaderCompactStandardNavbarOptions: jest.fn(() => ({})),
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

jest.mock('../../../../../constants/navigation/Routes', () => ({
  BRIDGE: {
    MODALS: {
      ROOT: 'BridgeModals',
      NETWORK_LIST_MODAL: 'NetworkListModal',
    },
  },
}));

const mockFormatAddressToAssetId = jest.fn<string | null, [string, string]>(
  () => 'eip155:1/erc20:0x1234',
);
const mockIsNonEvmChainId = jest.fn<boolean, [string]>(() => false);
jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: (address: string, chainId: string) =>
    mockFormatAddressToAssetId(address, chainId),
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
  UnifiedSwapBridgeEventName: {
    AssetDetailTooltipClicked: 'AssetDetailTooltipClicked',
  },
}));

jest.mock('../../../../../core/Multichain/utils', () => ({
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
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
    IconName: { Info: 'Info', Check: 'Check' },
    Icon: 'Icon',
    IconSize: { Md: 'Md' },
    TextVariant: {
      HeadingSm: 'HeadingSm',
      HeadingMd: 'HeadingMd',
      HeadingLg: 'HeadingLg',
      BodyMd: 'BodyMd',
      BodySm: 'BodySm',
    },
    TextColor: {
      TextDefault: 'text-default',
      TextAlternative: 'text-alternative',
      PrimaryInverse: 'text-primary-inverse',
    },
    AvatarNetwork: 'AvatarNetwork',
    AvatarNetworkSize: { Xs: '16', Sm: '24' },
    AvatarBaseShape: { Circle: 'circle', Square: 'square' },
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
    FontWeight: { Medium: '500' },
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
    onMorePress,
  }: {
    onChainSelect: (chainId?: CaipChainId) => void;
    onMorePress: () => void;
  }) => {
    const { createElement } = jest.requireActual('react');
    const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
    const reactRedux =
      jest.requireActual<typeof import('react-redux')>('react-redux');
    const visiblePillChainIds = reactRedux.useSelector(
      (state: { bridge: { visiblePillChainIds?: CaipChainId[] } }) =>
        state.bridge.visiblePillChainIds,
    );

    return createElement(
      View,
      { testID: 'network-pills' },
      createElement(TouchableOpacity, {
        testID: 'select-eth-network',
        onPress: () => onChainSelect(MOCK_CHAIN_IDS.ethereum),
      }),
      createElement(TouchableOpacity, {
        testID: 'select-polygon-network',
        onPress: () => onChainSelect(MOCK_CHAIN_IDS.polygon),
      }),
      createElement(TouchableOpacity, {
        testID: 'open-network-modal',
        onPress: onMorePress,
      }),
      createElement(
        Text,
        { testID: 'visible-pill-chain-ids' },
        JSON.stringify(visiblePillChainIds ?? []),
      ),
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
      onPressClearButton,
    }: {
      onChangeText: (text: string) => void;
      testID: string;
      value?: string;
      onPressClearButton?: () => void;
    }) =>
      createElement(
        View,
        null,
        createElement(TextInput, { onChangeText, testID, value }),
        !!value &&
          createElement(TouchableOpacity, {
            testID: 'bridge-token-search-clear-button',
            onPress: onPressClearButton,
          }),
      );
  },
);

jest.mock('../SkeletonItem', () => ({
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
  mockNavigationDispatch.mockReset();
  mockUsePopularTokens.mockClear();
  mockUseSearchTokens.mockClear();
  mockUseBalancesByAssetId.mockClear();
};

describe('tokenToIncludeAsset', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFormatAddressToAssetId.mockReturnValue('eip155:1/erc20:0x1234');
    mockIsNonEvmChainId.mockReturnValue(false);
  });

  it('returns null when formatAddressToAssetId returns null', () => {
    mockFormatAddressToAssetId.mockReturnValue(null);
    const token = createMockToken();

    const result = tokenToIncludeAsset(token);

    expect(result).toBeNull();
  });

  it('returns IncludeAsset with lowercase assetId for EVM token', () => {
    mockFormatAddressToAssetId.mockReturnValue('EIP155:1/ERC20:0xABCD');
    mockIsNonEvmChainId.mockReturnValue(false);
    const token = createMockToken({
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    });

    const result = tokenToIncludeAsset(token);

    expect(result).toEqual({
      address: '0x1234567890123456789012345678901234567890',
      assetId: 'eip155:1/erc20:0xabcd',
      chainId: '0x1',
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
    const token = createMockToken({
      address: 'bc1qe0vuqc0338sxdjz3jncel3wfa5xut48m4yv5wv',
      symbol: 'BTC',
      name: 'Bitcoin',
      decimals: 8,
      chainId: 'bip122:000000000019d6689c085ae165831e93',
    });

    const result = tokenToIncludeAsset(token);

    expect(result).toEqual({
      address: 'bc1qe0vuqc0338sxdjz3jncel3wfa5xut48m4yv5wv',
      assetId: 'bip122:000000000019d6689c085ae165831e93/slip44:0',
      chainId: 'bip122:000000000019d6689c085ae165831e93',
      name: 'Bitcoin',
      symbol: 'BTC',
      decimals: 8,
    });
  });

  it('uses empty string for undefined token name', () => {
    const token = createMockToken({ name: undefined });

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
      const store = createMockStore();
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
        store,
      );
      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      mockRouteParams = { type: 'dest' };
      rerender(
        <Provider store={store}>
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

  describe('picker defaults', () => {
    it.each([
      { pickerType: 'source' as const, selectedToken: null },
      { pickerType: 'dest' as const, selectedToken: null },
    ])(
      'uses all allowed chains by default for $pickerType picker',
      async ({ pickerType, selectedToken }) => {
        mockRouteParams = { type: pickerType };
        mockSelectedToken = selectedToken;

        renderWithReduxProvider(<BridgeTokenSelector />);

        await waitFor(() => {
          expect(mockUseBalancesByAssetId).toHaveBeenCalledWith(
            expect.objectContaining({
              chainIds: [MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon],
            }),
          );
          expect(mockUsePopularTokens).toHaveBeenCalledWith(
            expect.objectContaining({
              chainIds: [MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon],
            }),
          );
          expect(mockUseSearchTokens).toHaveBeenCalledWith(
            expect.objectContaining({
              chainIds: [MOCK_CHAIN_IDS.ethereum, MOCK_CHAIN_IDS.polygon],
            }),
          );
        });
      },
    );

    it('uses selected destination token chain when destination picker opens', async () => {
      mockRouteParams = { type: 'dest' };
      mockSelectedToken = createMockToken({ chainId: '0x89' });

      renderWithReduxProvider(<BridgeTokenSelector />);

      await waitFor(() => {
        expect(mockUseBalancesByAssetId).toHaveBeenCalledWith(
          expect.objectContaining({
            chainIds: [MOCK_CHAIN_IDS.polygon],
          }),
        );
        expect(mockUsePopularTokens).toHaveBeenCalledWith(
          expect.objectContaining({
            chainIds: [MOCK_CHAIN_IDS.polygon],
          }),
        );
      });
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

    it('scopes token fetch and search to selected chain after network selection', async () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      mockSearchTokens.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('select-polygon-network'));
      });

      expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
      expect(mockResetSearch).toHaveBeenCalled();

      await waitFor(() => {
        expect(mockUsePopularTokens).toHaveBeenCalledWith(
          expect.objectContaining({
            chainIds: [MOCK_CHAIN_IDS.polygon],
          }),
        );
        expect(mockUseSearchTokens).toHaveBeenCalledWith(
          expect.objectContaining({
            chainIds: [MOCK_CHAIN_IDS.polygon],
          }),
        );
      });
      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('ETH');
      });
    });
  });

  describe('pill order persistence', () => {
    it('keeps visible pill order while moving between source and destination pickers', async () => {
      const store = createMockStore();
      const persistentOrder = [MOCK_CHAIN_IDS.polygon, MOCK_CHAIN_IDS.ethereum];
      const { getByTestId, rerender } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      await act(async () => {
        store.dispatch({
          type: 'bridge/setVisiblePillChainIds',
          payload: persistentOrder,
        });
      });

      expect(getByTestId('visible-pill-chain-ids').props.children).toBe(
        JSON.stringify(persistentOrder),
      );

      mockRouteParams = { type: 'dest' };
      rerender(
        <Provider store={store}>
          <BridgeTokenSelector />
        </Provider>,
      );
      expect(getByTestId('visible-pill-chain-ids').props.children).toBe(
        JSON.stringify(persistentOrder),
      );

      mockRouteParams = { type: 'source' };
      rerender(
        <Provider store={store}>
          <BridgeTokenSelector />
        </Provider>,
      );
      expect(getByTestId('visible-pill-chain-ids').props.children).toBe(
        JSON.stringify(persistentOrder),
      );
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
      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PUSH',
          payload: expect.objectContaining({
            name: 'Asset',
            params: expect.objectContaining({
              symbol: 'USDC',
              name: 'USD Coin',
              assetId:
                'eip155:1/erc20:0x1234567890123456789012345678901234567890',
              chainId: '0x1',
              decimals: 18,
              image: 'https://example.com/token.png',
            }),
          }),
        }),
      );
      expect(mockTrackEvent).toHaveBeenCalled();
    });
  });
});
