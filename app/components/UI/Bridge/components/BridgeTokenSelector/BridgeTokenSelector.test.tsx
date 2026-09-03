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
import {
  setIsSelectingToken,
  setSourceAmount,
  setTokenSelectorNetworkFilter,
  setSourceToken,
  setDestToken,
  selectAllowedChainRanking,
} from '../../../../../core/redux/slices/bridge';
import { TokenDetailsSource } from '../../../TokenDetails/constants/constants';
import Routes from '../../../../../constants/navigation/Routes';
import { ARC_NATIVE_ASSET_ID } from '../../../../hooks/useArcDefaultTokens';

let mockBridgeFeatureFlags: {
  chainRanking?: { chainId: CaipChainId; name?: string }[];
  chains?: Record<string, { noFeeAssets?: string[] }>;
} = {
  chainRanking: [
    { chainId: MOCK_CHAIN_IDS.ethereum, name: 'Ethereum' },
    { chainId: MOCK_CHAIN_IDS.polygon, name: 'Polygon' },
  ],
  chains: {},
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

interface MockBridgeAction {
  type: string;
  payload?:
    | CaipChainId
    | CaipChainId[]
    | ReturnType<typeof createMockToken>
    | undefined;
}

// Create a Redux store with all the state needed by the component
const createMockStore = (bridgeStateOverrides: Partial<MockBridgeState> = {}) =>
  configureStore({
    reducer: {
      user: () => ({ appTheme: 'light' }),
      settings: () => ({
        basicFunctionalityEnabled: true,
      }),
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
        action: MockBridgeAction,
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
        if (action.type === 'bridge/setSourceToken') {
          return {
            ...resolvedState,
            sourceToken: action.payload as ReturnType<
              typeof createMockToken
            > | null,
          };
        }
        if (action.type === 'bridge/setDestToken') {
          return {
            ...resolvedState,
            destToken: action.payload as ReturnType<
              typeof createMockToken
            > | null,
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
const mockGoBack = jest.fn();
const mockNavigationDispatch = jest.fn();
let mockRouteParams: {
  type: 'source' | 'dest';
  enabledChainIds?: CaipChainId[];
  excludeRwaTokens?: boolean;
} = { type: 'source' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    dispatch: mockNavigationDispatch,
    goBack: mockGoBack,
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

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'usd'),
}));

jest.mock('../../../../../selectors/featureFlagController/rwa', () => ({
  selectRWAEnabledFlag: jest.fn(() => false),
}));

jest.mock('../../../../../hooks', () => ({
  useABTest: () => ({ variant: undefined }),
}));

// Use a getter to access mockBridgeFeatureFlags at runtime (after variable is defined)
// This is needed because jest.mock is hoisted before variable declarations
jest.mock('../../../../../core/redux/slices/bridge', () => {
  const emptyChainRanking: { chainId: CaipChainId; name: string }[] = [];
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
                bridgeFeatureFlags?: {
                  chainRanking?: { chainId: CaipChainId; name: string }[];
                };
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
    setSourceAmount: jest.fn((amount: string | undefined) => ({
      type: 'bridge/setSourceAmount',
      payload: amount,
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
    setSourceToken: jest.fn((token) => ({
      type: 'bridge/setSourceToken',
      payload: token,
    })),
    setDestToken: jest.fn((token) => ({
      type: 'bridge/setDestToken',
      payload: token,
    })),
  };
});

let mockPopularTokensState = {
  popularTokens: [createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' })],
  isLoading: false,
};
const mockUsePopularTokens = jest.fn((_: unknown) => mockPopularTokensState);
jest.mock('../../hooks/usePopularTokens', () => ({
  usePopularTokens: (params: unknown) => mockUsePopularTokens(params),
}));

let mockBalancesByAssetIdState = {
  tokensWithBalance: [] as ReturnType<typeof createMockToken>[],
  balancesByAssetId: {} as Record<
    string,
    {
      balance: string;
      balanceFiat?: string;
      tokenFiatAmount?: number;
    }
  >,
};

const mockUseInitialBridgeTokens = jest.fn((_: unknown) => ({
  includeAssets: [],
  fetchPopularTokens: jest.fn(),
  balancesByAssetId: mockBalancesByAssetIdState.balancesByAssetId,
  searchIncludeAssets: [],
}));
jest.mock('../../hooks/useInitialBridgeTokens', () => ({
  useInitialBridgeTokens: (params: unknown) =>
    mockUseInitialBridgeTokens(params),
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
const mockUseSearchTokens = jest.fn((_: unknown) => mockSearchTokensState);
jest.mock('../../hooks/useSearchTokens', () => ({
  useSearchTokens: (params: unknown) => mockUseSearchTokens(params),
}));

const mockUseBalancesByAssetId = jest.fn(
  (_: unknown) => mockBalancesByAssetIdState,
);
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

let mockIsWatchlistEnabled = false;
const mockUseTokenWatchlistQuery = jest.fn();

jest.mock('../../../Assets/selectors/featureFlags', () => ({
  selectTokenWatchlistEnabled: jest.fn(() => mockIsWatchlistEnabled),
}));

jest.mock('../../../Assets/watchlist/hooks/useTokenWatchlistQuery', () => ({
  useTokenWatchlistQuery: () => mockUseTokenWatchlistQuery(),
}));

jest.mock('../../../Assets/watchlist/components/WatchlistEmptyCTA', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () =>
      createElement(View, {
        testID: 'watchlist-empty-cta-container',
      }),
  };
});

const mockAnalyticsTrackEvent = jest.fn();
const mockAddProperties = jest.fn().mockReturnThis();
const mockBuild = jest.fn(() => ({}));
const mockCreateEventBuilder = jest.fn(() => ({
  addProperties: mockAddProperties,
  build: mockBuild,
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockAnalyticsTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

const mockTrackEvent = jest.fn();
const mockResetBridgeControllerState = jest.fn();
jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        trackUnifiedSwapBridgeEvent: (...args: unknown[]) =>
          mockTrackEvent(...args),
        resetState: () => mockResetBridgeControllerState(),
      },
      AuthenticationController: {
        getBearerToken: jest.fn().mockResolvedValue('bearer-token'),
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
  ...jest.requireActual('@metamask/bridge-controller'),
  formatAddressToAssetId: (address: string, chainId: string) =>
    mockFormatAddressToAssetId(address, chainId),
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
  isNonEvmChainId: (chainId: string) => mockIsNonEvmChainId(chainId),
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
    ButtonIcon: ({
      onPress,
      iconName,
      testID,
    }: {
      onPress?: () => void;
      iconName?: string;
      testID?: string;
    }) =>
      createElement(TouchableOpacity, {
        onPress,
        // Derive the testID from the iconName so different ButtonIcons
        // (e.g. Info on each row, ArrowLeft in the inline header) don't
        // collide on the same selector.
        testID:
          testID ??
          `button-icon-${String(iconName ?? 'unknown').toLowerCase()}`,
      }),
    ButtonIconSize: { Md: 'Md', Sm: 'Sm' },
    IconColor: {
      IconAlternative: 'IconAlternative',
      IconDefault: 'IconDefault',
      PrimaryDefault: 'PrimaryDefault',
    },
    IconName: {
      Info: 'Info',
      Check: 'Check',
      ArrowLeft: 'ArrowLeft',
      Close: 'Close',
      Merge: 'Merge',
    },
    Icon: 'Icon',
    IconSize: { Md: 'Md', Lg: 'Lg' },
    HeaderStandard: ({
      title,
      onBack,
    }: {
      title?: string;
      onBack?: () => void;
    }) =>
      createElement(
        View,
        { testID: 'header-standard' },
        // Render the title text so existing assertions on `getByText(title)` pass.
        // Render the back button only when onBack is provided to mirror the
        // real component's behaviour.
        title
          ? createElement('Text', { testID: 'header-standard-title' }, title)
          : null,
        onBack
          ? createElement(TouchableOpacity, {
              onPress: onBack,
              testID: 'button-icon-arrowleft',
            })
          : null,
      ),
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
    FontWeight: { Medium: '500' },
    AvatarNetwork: 'AvatarNetwork',
    AvatarNetworkSize: { Xs: '16', Sm: '24' },
    AvatarBaseShape: { Circle: 'circle', Square: 'square' },
    BoxAlignItems: { Center: 'center' },
    BoxFlexDirection: { Row: 'row' },
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const tw = (..._args: unknown[]) => ({});
  tw.style = jest.fn(() => ({}));
  return { useTailwind: () => tw };
});
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
    onWatchlistFilterPress,
    showWatchlistFilter,
    enabledChainIds,
  }: {
    onChainSelect: (chainId?: CaipChainId) => void;
    onMorePress: () => void;
    onWatchlistFilterPress?: () => void;
    showWatchlistFilter?: boolean;
    enabledChainIds?: CaipChainId[];
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
      showWatchlistFilter && onWatchlistFilterPress
        ? createElement(TouchableOpacity, {
            testID: 'bridge-watchlist-filter-watchlist',
            onPress: onWatchlistFilterPress,
          })
        : null,
      createElement(TouchableOpacity, {
        testID: 'select-eth-network',
        onPress: () => onChainSelect(MOCK_CHAIN_IDS.ethereum),
      }),
      createElement(TouchableOpacity, {
        testID: 'select-polygon-network',
        onPress: () => onChainSelect(MOCK_CHAIN_IDS.polygon),
      }),
      createElement(TouchableOpacity, {
        testID: 'select-all-networks',
        onPress: () => onChainSelect(undefined),
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
      createElement(
        Text,
        { testID: 'network-pills-enabled-chain-ids' },
        JSON.stringify(enabledChainIds ?? null),
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

jest.mock(
  '../../../../../component-library/components-temp/TabEmptyState',
  () => {
    const { createElement } = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      TabEmptyState: ({
        testID,
        children,
      }: {
        testID?: string;
        children?: React.ReactNode;
      }) => createElement(View, { testID }, children),
    };
  },
);

jest.mock('../TokenSelectorItem', () => ({
  TokenSelectorItem: ({
    token,
    onPress,
    children,
    isNoFeeAsset,
    showStockBadge,
  }: {
    token: {
      symbol: string;
      address: string;
      chainId: string;
      isVerified?: boolean;
    };
    onPress: (token: {
      symbol: string;
      address: string;
      chainId: string;
    }) => void;
    children?: React.ReactNode;
    isNoFeeAsset?: boolean;
    showStockBadge?: boolean;
  }) => {
    const { createElement } = jest.requireActual('react');
    const { TouchableOpacity, Text, View } = jest.requireActual('react-native');

    return createElement(
      TouchableOpacity,
      { onPress: () => onPress(token), testID: `token-${token.symbol}` },
      createElement(Text, null, token.symbol),
      token.isVerified
        ? createElement(
            Text,
            { testID: `verified-${token.symbol}` },
            'verified',
          )
        : null,
      isNoFeeAsset
        ? createElement(Text, { testID: `no-fee-${token.symbol}` }, 'No fee')
        : null,
      showStockBadge
        ? createElement(Text, { testID: `stock-${token.symbol}` }, 'Stock')
        : null,
      createElement(View, null, children),
    );
  },
}));

jest.mock('react-native-gesture-handler', () => {
  const { FlatList, ScrollView } = jest.requireActual('react-native');
  return { FlatList, ScrollView };
});

const mockFlashListScrollToIndex = jest.fn().mockResolvedValue(undefined);
const mockFlashListMount = jest.fn();
const mockFlashListUnmount = jest.fn();

jest.mock('@shopify/flash-list', () => {
  const ReactMock = jest.requireActual('react');
  const { FlatList } = jest.requireActual('react-native');

  const MockFlashList = ReactMock.forwardRef(
    (props: Record<string, unknown>, ref: React.ForwardedRef<unknown>) => {
      ReactMock.useImperativeHandle(ref, () => ({
        scrollToIndex: mockFlashListScrollToIndex,
      }));
      ReactMock.useEffect(() => {
        mockFlashListMount();
        return () => mockFlashListUnmount();
      }, []);

      return ReactMock.createElement(FlatList, props);
    },
  );

  return { FlashList: MockFlashList };
});

const resetMocks = () => {
  mockRouteParams = { type: 'source' };
  mockBridgeFeatureFlags = {
    chainRanking: [
      { chainId: MOCK_CHAIN_IDS.ethereum, name: 'Ethereum' },
      { chainId: MOCK_CHAIN_IDS.polygon, name: 'Polygon' },
    ],
    chains: {},
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
  mockGoBack.mockReset();
  mockUsePopularTokens.mockClear();
  mockUseSearchTokens.mockClear();
  mockUseBalancesByAssetId.mockClear();
  mockIsWatchlistEnabled = false;
  mockUseTokenWatchlistQuery.mockReturnValue({
    data: [],
    isLoading: false,
  });
  mockAnalyticsTrackEvent.mockClear();
  mockCreateEventBuilder.mockClear();
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

const createSearchToken = (
  symbol: string,
  overrides: Partial<ReturnType<typeof createMockPopularToken>> = {},
) =>
  createMockPopularToken({
    assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}` as never,
    symbol,
    ...overrides,
  });

describe('BridgeTokenSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  describe('rendering', () => {
    it('sets selecting token state on mount and clears on unmount', () => {
      const { unmount } = renderWithReduxProvider(<BridgeTokenSelector />);

      expect(setIsSelectingToken).toHaveBeenCalledWith(true);
      unmount();
      expect(setIsSelectingToken).toHaveBeenCalledWith(false);
    });

    it('renders the search input and inline header title', () => {
      const { getByTestId, getByText } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      expect(getByTestId('bridge-token-search-input')).toBeTruthy();
      // Header is now inlined inside the screen instead of being set via
      // navigation.setOptions, so assert on the rendered title instead.
      // strings() is mocked to return the key.
      expect(getByText('bridge.select_token')).toBeTruthy();
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
      await waitFor(() => expect(getByTestId('no-fee-USDC')).toBeTruthy());

      mockRouteParams = { type: 'dest' };
      rerender(
        <Provider store={store}>
          <BridgeTokenSelector />
        </Provider>,
      );
      await waitFor(() => expect(getByTestId('no-fee-USDC')).toBeTruthy());
    });

    it('passes verified popular tokens through to selector rows', async () => {
      mockPopularTokensState = {
        popularTokens: [
          createMockPopularToken({
            symbol: 'ETH',
            name: 'Ethereum',
            isVerified: true,
          }),
        ],
        isLoading: false,
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      await waitFor(() => expect(getByTestId('verified-ETH')).toBeTruthy());
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

    it('passes verified search results through to selector rows', async () => {
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH', { isVerified: true })],
        currentSearchQuery: 'WET',
      };
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');

      await waitFor(() => expect(getByTestId('verified-WETH')).toBeTruthy());
    });

    it('shows empty state when search returns no results', async () => {
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [],
        isSearchLoading: false,
        currentSearchQuery: 'XYZ',
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'XYZ');

      await waitFor(() =>
        expect(getByTestId('bridge-token-selector-empty-state')).toBeTruthy(),
      );
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
          expect(mockUseInitialBridgeTokens).toHaveBeenCalledWith([
            MOCK_CHAIN_IDS.ethereum,
            MOCK_CHAIN_IDS.polygon,
          ]);
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
        expect(mockUseInitialBridgeTokens).toHaveBeenCalledWith([
          MOCK_CHAIN_IDS.polygon,
        ]);
      });
    });

    // Restores the default (unfiltered-by-enabledChainIds) mock
    // implementation for subsequent tests.
    const restoreDefaultAllowedChainRankingMock = () => {
      // The state shape here mirrors this file's local jest.mock stub for
      // the bridge slice (see top of file), not the real RootState, since
      // this module is fully mocked. Cast past the real selector's type to
      // keep jest.mocked() happy about the mockImplementation's signature.
      jest.mocked(selectAllowedChainRanking).mockImplementation(
        ((state: {
          engine: {
            backgroundState: {
              BridgeController: {
                bridgeState: {
                  bridgeFeatureFlags?: {
                    chainRanking?: { chainId: CaipChainId; name: string }[];
                  };
                };
              };
            };
          };
        }) =>
          state.engine.backgroundState.BridgeController.bridgeState
            .bridgeFeatureFlags?.chainRanking ??
          []) as unknown as typeof selectAllowedChainRanking,
      );
    };

    it('falls back to all enabled chains when the initial dest filter chain is outside enabledChainIds', async () => {
      // Selected dest token lives on Polygon, but this picker (e.g. Limit
      // Order) is scoped to Ethereum only, so Polygon is excluded from the
      // allowed chainRanking returned to pills/network modal.
      const enabledChainIds = [MOCK_CHAIN_IDS.ethereum];
      mockRouteParams = { type: 'dest', enabledChainIds };
      mockSelectedToken = createMockToken({ chainId: '0x89' });

      const restrictedRanking = [
        { chainId: MOCK_CHAIN_IDS.ethereum, name: 'Ethereum' },
      ];
      jest
        .mocked(selectAllowedChainRanking)
        .mockImplementation(() => restrictedRanking);

      renderWithReduxProvider(<BridgeTokenSelector />);

      try {
        await waitFor(() => {
          expect(mockUseInitialBridgeTokens).toHaveBeenCalledWith([
            MOCK_CHAIN_IDS.ethereum,
          ]);
        });
        expect(mockUseInitialBridgeTokens).not.toHaveBeenCalledWith([
          MOCK_CHAIN_IDS.polygon,
        ]);
      } finally {
        restoreDefaultAllowedChainRankingMock();
      }
    });

    it('clears a stale Redux network filter and re-anchors source/dest to ETH/mUSD when Ethereum is enabled', async () => {
      // Redux still holds a filter set by a previous (unrestricted) picker
      // instance, but this picker (e.g. Limit Order) is scoped to Ethereum
      // only, so Polygon is excluded from the allowed chainRanking. Leaving
      // the stale filter in place would fetch all enabled chains while no
      // pill (and no "All networks" option) appears selected, and the
      // underlying source/dest pair would still reference an unsupported
      // chain for this picker.
      const enabledChainIds = [MOCK_CHAIN_IDS.ethereum];
      mockRouteParams = { type: 'source', enabledChainIds };

      const restrictedRanking = [
        { chainId: MOCK_CHAIN_IDS.ethereum, name: 'Ethereum' },
      ];
      jest
        .mocked(selectAllowedChainRanking)
        .mockImplementation(() => restrictedRanking);

      const store = createMockStore({
        tokenSelectorNetworkFilter: MOCK_CHAIN_IDS.polygon,
      });

      try {
        renderWithReduxProvider(<BridgeTokenSelector />, store);

        await waitFor(() => {
          expect(
            store.getState().bridge.tokenSelectorNetworkFilter,
          ).toBeUndefined();
        });

        expect(setSourceToken).toHaveBeenCalledWith(
          expect.objectContaining({ chainId: '0x1', symbol: 'ETH' }),
        );
        expect(setDestToken).toHaveBeenCalledWith(
          expect.objectContaining({ chainId: '0x1', symbol: 'mUSD' }),
        );
        // Source and dest must share the same chainId format (hex for EVM).
        const [dispatchedSourceToken] =
          jest.mocked(setSourceToken).mock.calls[0];
        const [dispatchedDestToken] = jest.mocked(setDestToken).mock.calls[0];
        expect(dispatchedSourceToken?.chainId).toBe(
          dispatchedDestToken?.chainId,
        );
      } finally {
        restoreDefaultAllowedChainRankingMock();
      }
    });

    it('re-anchors source/dest to the first enabled chain default pair when Ethereum is not enabled', async () => {
      // Picker is scoped to Polygon only (e.g. a Polygon-only flow), so
      // Ethereum isn't an option — the fallback pair should come from the
      // top-ranked enabled chain instead.
      const enabledChainIds = [MOCK_CHAIN_IDS.polygon];
      mockRouteParams = { type: 'source', enabledChainIds };

      const restrictedRanking = [
        { chainId: MOCK_CHAIN_IDS.polygon, name: 'Polygon' },
      ];
      jest
        .mocked(selectAllowedChainRanking)
        .mockImplementation(() => restrictedRanking);

      const store = createMockStore({
        tokenSelectorNetworkFilter: MOCK_CHAIN_IDS.ethereum,
      });

      try {
        renderWithReduxProvider(<BridgeTokenSelector />, store);

        await waitFor(() => {
          expect(
            store.getState().bridge.tokenSelectorNetworkFilter,
          ).toBeUndefined();
        });

        expect(setSourceToken).toHaveBeenCalledWith(
          expect.objectContaining({ chainId: '0x89' }),
        );
        expect(setSourceToken).not.toHaveBeenCalledWith(
          expect.objectContaining({ symbol: 'ETH' }),
        );
      } finally {
        restoreDefaultAllowedChainRankingMock();
      }
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

  describe('RWA filtering', () => {
    const createRwaPopularToken = (symbol: string, name: string) =>
      ({
        ...createMockPopularToken({
          assetId: `eip155:1/erc20:0x${symbol.toLowerCase()}` as never,
          symbol,
          name,
        }),
        rwaData: { instrumentType: 'stock' },
      }) as never;

    it('keeps RWA tokens when excludeRwaTokens is not set', async () => {
      mockPopularTokensState = {
        popularTokens: [
          createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' }),
          createRwaPopularToken('AAPLX', 'Apple Inc'),
        ],
        isLoading: false,
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      expect(getByTestId('token-AAPLX')).toBeTruthy();
    });

    it('hides RWA popular tokens when excludeRwaTokens is set', async () => {
      mockRouteParams = { type: 'source', excludeRwaTokens: true };
      mockPopularTokensState = {
        popularTokens: [
          createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' }),
          createRwaPopularToken('AAPLX', 'Apple Inc'),
        ],
        isLoading: false,
      };

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      expect(queryByTestId('token-AAPLX')).toBeNull();
    });

    it('hides Ondo Tokenized popular tokens matched by name', async () => {
      mockRouteParams = { type: 'source', excludeRwaTokens: true };
      mockPopularTokensState = {
        popularTokens: [
          createMockPopularToken({ symbol: 'USDC', name: 'USD Coin' }),
          createMockPopularToken({
            assetId: 'eip155:1/erc20:0xondo' as never,
            symbol: 'TSLAon',
            name: 'Ondo Tokenized Tesla',
          }),
        ],
        isLoading: false,
      };

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
      expect(queryByTestId('token-TSLAon')).toBeNull();
    });

    it('hides RWA search results when excludeRwaTokens is set', async () => {
      mockRouteParams = { type: 'source', excludeRwaTokens: true };
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [
          createSearchToken('WETH'),
          createRwaPopularToken('MSFTX', 'Microsoft Corp'),
        ],
        currentSearchQuery: 'WET',
      };

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');

      await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());
      expect(queryByTestId('token-MSFTX')).toBeNull();
    });

    it('hides empty state while an all-RWA page still has a cursor to auto-load', async () => {
      mockRouteParams = { type: 'source', excludeRwaTokens: true };
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createRwaPopularToken('MSFTX', 'Microsoft Corp')],
        searchCursor: 'next-cursor',
        currentSearchQuery: 'MSF',
      };

      const { getByTestId, queryByTestId, UNSAFE_getByType } =
        renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'MSF');

      const { FlatList } = jest.requireActual('react-native');
      await act(async () => {
        UNSAFE_getByType(FlatList).props.onLayout({
          nativeEvent: { layout: { height: 500 } },
        });
      });

      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('MSF', 'next-cursor');
      });
      expect(queryByTestId('bridge-token-selector-empty-state')).toBeNull();
    });

    it('shows empty state once an all-RWA search exhausts its cursor', async () => {
      mockRouteParams = { type: 'source', excludeRwaTokens: true };
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createRwaPopularToken('MSFTX', 'Microsoft Corp')],
        searchCursor: undefined,
        currentSearchQuery: 'MSF',
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'MSF');

      await waitFor(() =>
        expect(getByTestId('bridge-token-selector-empty-state')).toBeTruthy(),
      );
    });

    it.each([
      { excludeRwaTokens: undefined, isRwaVisible: true },
      { excludeRwaTokens: true, isRwaVisible: false },
    ])(
      'renders Ondo Tokenized watchlist tokens: $isRwaVisible when excludeRwaTokens is $excludeRwaTokens',
      async ({ excludeRwaTokens, isRwaVisible }) => {
        mockRouteParams = { type: 'source', excludeRwaTokens };
        mockIsWatchlistEnabled = true;
        mockUseTokenWatchlistQuery.mockReturnValue({
          data: [
            {
              assetId: 'eip155:1/slip44:60',
              name: 'Ethereum',
              symbol: 'ETH',
              decimals: 18,
              balance: '1.5',
              balanceFiat: 3000,
              fiatCurrency: 'usd',
              isInWallet: true,
            },
            {
              assetId: 'eip155:1/erc20:0xondo',
              name: 'Ondo Tokenized Tesla',
              symbol: 'TSLAon',
              decimals: 18,
              balance: '2',
              balanceFiat: 500,
              fiatCurrency: 'usd',
              isInWallet: true,
            },
          ],
          isLoading: false,
        });

        const { getByTestId, queryByTestId } = renderWithReduxProvider(
          <BridgeTokenSelector />,
        );

        fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

        await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
        expect(Boolean(queryByTestId('token-TSLAon'))).toBe(isRwaVisible);
      },
    );
  });

  describe('chain selection', () => {
    it('resets the mounted list after scrolling and changing networks', async () => {
      const { getByTestId, UNSAFE_getByType } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      const initialMountCount = mockFlashListMount.mock.calls.length;
      const { FlatList } = jest.requireActual('react-native');
      const flushAnimationFrame = async () => {
        await act(async () => {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => resolve());
          });
        });
      };

      await act(async () => {
        UNSAFE_getByType(FlatList).props.onScroll({
          nativeEvent: {
            layoutMeasurement: { height: 500 },
            contentOffset: { y: 500 },
            contentSize: { height: 2000 },
          },
        });
      });

      // Flush rAF after each chain change so the scroll reset effect does not
      // race (cleanup can cancel a pending frame when presses are back-to-back).
      await act(async () => {
        fireEvent.press(getByTestId('select-eth-network'));
      });
      await flushAnimationFrame();
      await act(async () => {
        fireEvent.press(getByTestId('select-all-networks'));
      });
      await flushAnimationFrame();

      expect(mockFlashListScrollToIndex).toHaveBeenCalledTimes(2);
      expect(mockFlashListScrollToIndex).toHaveBeenLastCalledWith({
        index: 0,
        animated: false,
      });
      expect(mockFlashListMount).toHaveBeenCalledTimes(initialMountCount);
      expect(mockFlashListUnmount).not.toHaveBeenCalled();
    });

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

    it('does nothing when selecting the already selected network', async () => {
      const store = createMockStore({
        tokenSelectorNetworkFilter: MOCK_CHAIN_IDS.ethereum,
      });
      const { getByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      jest.mocked(setTokenSelectorNetworkFilter).mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('select-eth-network'));
      });

      expect(setTokenSelectorNetworkFilter).not.toHaveBeenCalled();
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
        expect(mockUseInitialBridgeTokens).toHaveBeenCalledWith([
          MOCK_CHAIN_IDS.polygon,
        ]);
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

  describe('keyboard interactions', () => {
    it('forwards handled taps while the search keyboard is open', () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      expect(getByTestId('bridge-token-list')).toHaveProp(
        'keyboardShouldPersistTaps',
        'handled',
      );
    });
  });

  describe('pagination', () => {
    it('disables visible-content position maintenance', () => {
      const { UNSAFE_getByType } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      const { FlatList } = jest.requireActual('react-native');

      expect(
        UNSAFE_getByType(FlatList).props.maintainVisibleContentPosition,
      ).toEqual({ disabled: true });
    });

    it('sets a frame-rate scroll event throttle', () => {
      const { UNSAFE_getByType } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );
      const { FlatList } = jest.requireActual('react-native');

      expect(UNSAFE_getByType(FlatList).props.scrollEventThrottle).toBe(16);
    });

    it('auto-loads next page when initial results do not fill the list', async () => {
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
        UNSAFE_getByType(FlatList).props.onLayout({
          nativeEvent: { layout: { height: 500 } },
        });
      });

      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('WET', 'next-cursor');
      });
    });

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
    it('navigates back when header back button is pressed', () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('button-icon-arrowleft'));

      expect(mockGoBack).toHaveBeenCalled();
    });

    it('opens network list modal from more networks pill', () => {
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('open-network-modal'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        params: { enabledChainIds: undefined },
      });
    });

    it('passes enabledChainIds from route params to the selector, NetworkPills, and the network list modal navigation', () => {
      const enabledChainIds = [MOCK_CHAIN_IDS.ethereum];
      mockRouteParams = { type: 'source', enabledChainIds };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      expect(selectAllowedChainRanking).toHaveBeenCalledWith(
        expect.anything(),
        enabledChainIds,
      );
      expect(
        getByTestId('network-pills-enabled-chain-ids').props.children,
      ).toBe(JSON.stringify(enabledChainIds));

      fireEvent.press(getByTestId('open-network-modal'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.BRIDGE.MODALS.ROOT, {
        screen: Routes.BRIDGE.MODALS.NETWORK_LIST_MODAL,
        params: { enabledChainIds },
      });
    });

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

  describe('watchlist filter', () => {
    it('does not render watchlist filter when feature flag is off', () => {
      mockIsWatchlistEnabled = false;
      const { queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      expect(queryByTestId('bridge-watchlist-filter-watchlist')).toBeNull();
    });

    it('renders watchlist filter when feature flag is on', () => {
      mockIsWatchlistEnabled = true;
      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      expect(getByTestId('bridge-watchlist-filter-watchlist')).toBeTruthy();
    });

    it('shows watchlist empty CTA when watchlist filter is active and empty', () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      expect(getByTestId('watchlist-empty-cta-container')).toBeTruthy();
      expect(queryByTestId('bridge-token-list')).toBeNull();
    });

    it('shows watchlist tokens for source picker when bridge balances are available', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '0',
            balanceFiat: 0,
            fiatCurrency: 'usd',
            isInWallet: false,
          },
        ],
        isLoading: false,
      });
      mockBalancesByAssetIdState = {
        tokensWithBalance: [],
        balancesByAssetId: {
          'eip155:1/slip44:60': {
            balance: '1.5',
            balanceFiat: '$3,000.00',
            tokenFiatAmount: 3000,
          },
        },
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
    });

    it('shows all watchlist tokens including zero balance on source picker', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
          {
            assetId:
              'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balance: '0',
            balanceFiat: 0,
            fiatCurrency: 'usd',
            isInWallet: false,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      expect(getByTestId('token-USDC')).toBeTruthy();
    });

    it('filters Arc native duplicate from watchlist tokens', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: ARC_NATIVE_ASSET_ID,
            name: 'USDC',
            symbol: 'USDC',
            decimals: 6,
            balance: '1',
            balanceFiat: 1,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      expect(queryByTestId('token-USDC')).toBeNull();
    });

    it('keeps full watchlist list for queries below minimum length', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
          {
            assetId:
              'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balance: '10',
            balanceFiat: 10,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'us');

      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      expect(getByTestId('token-USDC')).toBeTruthy();
      expect(mockDebouncedSearch).not.toHaveBeenCalled();
    });

    it('calls debounced search for valid watchlist queries', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
          {
            assetId:
              'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            name: 'USD Coin',
            symbol: 'USDC',
            decimals: 6,
            balance: '10',
            balanceFiat: 10,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'usd');

      expect(mockDebouncedSearch).toHaveBeenCalledWith('usd');
    });

    it('prepends watchlist matches ahead of default search results', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH')],
        currentSearchQuery: 'eth',
      };

      const { getByTestId, getAllByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'eth');

      await waitFor(() => {
        const symbols = getAllByTestId(/^token-/).map(
          (node) => node.props.testID,
        );
        expect(symbols.indexOf('token-ETH')).toBeLessThan(
          symbols.indexOf('token-WETH'),
        );
      });
    });

    it('tracks watchlist token selection analytics', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      fireEvent.press(getByTestId('token-ETH'));

      expect(mockAnalyticsTrackEvent).toHaveBeenCalled();
      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'Token List Item Clicked' }),
      );
      expect(mockAddProperties).toHaveBeenCalledWith({
        asset: 'eip155:1/slip44:60',
        source: TokenDetailsSource.SwapWatchlistFilter,
        position: 0,
      });
      expect(mockHandleTokenPress).toHaveBeenCalled();
    });

    it('does not track Token List Item Clicked during watchlist search', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH')],
        currentSearchQuery: 'eth',
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'eth');

      await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());
      fireEvent.press(getByTestId('token-WETH'));

      expect(mockAnalyticsTrackEvent).not.toHaveBeenCalled();
      expect(mockCreateEventBuilder).not.toHaveBeenCalledWith(
        'Token List Item Clicked',
      );
      expect(mockHandleTokenPress).toHaveBeenCalled();
    });

    it('clears network filter when watchlist filter is activated', () => {
      mockIsWatchlistEnabled = true;
      const store = createMockStore({
        tokenSelectorNetworkFilter: MOCK_CHAIN_IDS.ethereum,
      });

      const { getByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      expect(
        store.getState().bridge.tokenSelectorNetworkFilter,
      ).toBeUndefined();
    });

    it('restores network filter when watchlist filter is deactivated', () => {
      mockIsWatchlistEnabled = true;
      const store = createMockStore({
        tokenSelectorNetworkFilter: MOCK_CHAIN_IDS.ethereum,
      });

      const { getByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      expect(
        store.getState().bridge.tokenSelectorNetworkFilter,
      ).toBeUndefined();

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      expect(store.getState().bridge.tokenSelectorNetworkFilter).toBe(
        MOCK_CHAIN_IDS.ethereum,
      );
    });

    it('deactivates watchlist when network filter is set externally', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const store = createMockStore();
      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());

      await act(async () => {
        store.dispatch(setTokenSelectorNetworkFilter(MOCK_CHAIN_IDS.ethereum));
      });

      await waitFor(() => {
        expect(getByTestId('token-USDC')).toBeTruthy();
        expect(queryByTestId('token-ETH')).toBeNull();
      });
    });

    it('re-triggers search when network is selected externally while watchlist is active', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const store = createMockStore();
      const { getByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
        store,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      mockSearchTokens.mockClear();

      await act(async () => {
        store.dispatch(setTokenSelectorNetworkFilter(MOCK_CHAIN_IDS.ethereum));
      });

      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('ETH');
      });
    });

    it('exits watchlist mode and applies network when a network pill is pressed', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());

      jest.mocked(setTokenSelectorNetworkFilter).mockClear();
      mockDebouncedSearch.cancel.mockClear();
      mockResetSearch.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('select-polygon-network'));
      });

      expect(setTokenSelectorNetworkFilter).toHaveBeenCalledWith(
        MOCK_CHAIN_IDS.polygon,
      );
      expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
      expect(mockResetSearch).toHaveBeenCalled();
      await waitFor(() => {
        expect(getByTestId('token-USDC')).toBeTruthy();
        expect(queryByTestId('token-ETH')).toBeNull();
      });
    });

    it('re-triggers search after toggling watchlist off with an active query', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      mockSearchTokens.mockClear();

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('ETH');
      });
    });

    it('clears short watchlist search when toggling watchlist off', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId:
              'eip155:1/erc20:0x6982508145454ce325ddbef9b9008f994fce8312',
            name: 'Pepe',
            symbol: 'PEPE',
            decimals: 18,
            balance: '1000',
            balanceFiat: 1,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-PEPE')).toBeTruthy());
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'pe');
      expect(getByTestId('token-ETH')).toBeTruthy();

      mockSearchTokens.mockClear();
      mockResetSearch.mockClear();

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => {
        expect(getByTestId('bridge-token-search-input').props.value).toBe('');
      });
      expect(mockResetSearch).toHaveBeenCalled();
      expect(mockSearchTokens).not.toHaveBeenCalled();
    });

    it('re-triggers search after exiting watchlist with an active query', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      mockSearchTokens.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('select-polygon-network'));
      });

      await waitFor(() => {
        expect(mockSearchTokens).toHaveBeenCalledWith('ETH');
      });
    });

    it('shows skeleton items while watchlist data is loading', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [],
        isLoading: true,
      });

      const { getByTestId, getAllByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));

      await waitFor(() => {
        expect(getAllByTestId('skeleton-item').length).toBe(8);
      });
    });

    it('shows empty state when watchlist search has no matches', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [],
        isSearchLoading: false,
        currentSearchQuery: 'ZZZ',
      };

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ZZZ');

      await waitFor(() =>
        expect(getByTestId('bridge-token-selector-empty-state')).toBeTruthy(),
      );
    });

    it('shows empty state during watchlist search when popular tokens are still loading', async () => {
      mockIsWatchlistEnabled = true;
      mockPopularTokensState = { popularTokens: [], isLoading: true };
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [],
        isSearchLoading: false,
        currentSearchQuery: 'ZZZ',
      };

      const { getByTestId, queryAllByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ZZZ');

      await waitFor(() =>
        expect(getByTestId('bridge-token-selector-empty-state')).toBeTruthy(),
      );
      expect(queryAllByTestId('skeleton-item')).toHaveLength(0);
    });

    it('uses default swap search when empty watchlist query is active', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [],
        isLoading: false,
      });
      mockSearchTokensState = {
        ...mockSearchTokensState,
        searchResults: [createSearchToken('WETH')],
        currentSearchQuery: 'wet',
      };

      const { getByTestId, queryByTestId } = renderWithReduxProvider(
        <BridgeTokenSelector />,
      );

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      expect(getByTestId('watchlist-empty-cta-container')).toBeTruthy();

      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'wet');

      await waitFor(() => {
        expect(queryByTestId('watchlist-empty-cta-container')).toBeNull();
        expect(getByTestId('token-WETH')).toBeTruthy();
      });
      expect(mockDebouncedSearch).toHaveBeenCalledWith('wet');
    });

    it('resets API search when clearing valid watchlist query', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
      await waitFor(() =>
        expect(getByTestId('bridge-token-search-clear-button')).toBeTruthy(),
      );

      mockDebouncedSearch.cancel.mockClear();
      mockResetSearch.mockClear();

      await act(async () => {
        fireEvent.press(getByTestId('bridge-token-search-clear-button'));
      });

      expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
      expect(mockResetSearch).toHaveBeenCalled();
    });

    it('uses SwapWatchlistFilter source when info is pressed in watchlist mode', async () => {
      mockIsWatchlistEnabled = true;
      mockUseTokenWatchlistQuery.mockReturnValue({
        data: [
          {
            assetId: 'eip155:1/slip44:60',
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18,
            balance: '1.5',
            balanceFiat: 3000,
            fiatCurrency: 'usd',
            isInWallet: true,
          },
        ],
        isLoading: false,
      });

      const { getByTestId } = renderWithReduxProvider(<BridgeTokenSelector />);

      fireEvent.press(getByTestId('bridge-watchlist-filter-watchlist'));
      await waitFor(() => expect(getByTestId('token-ETH')).toBeTruthy());

      await act(async () => {
        fireEvent.press(getByTestId('button-icon-info'));
      });

      expect(mockNavigationDispatch).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'PUSH',
          payload: expect.objectContaining({
            name: 'Asset',
            params: expect.objectContaining({
              source: TokenDetailsSource.SwapWatchlistFilter,
            }),
          }),
        }),
      );
    });
  });
});
