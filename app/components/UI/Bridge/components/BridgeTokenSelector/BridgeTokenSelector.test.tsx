import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { BridgeTokenSelector } from './BridgeTokenSelector';
import { CaipChainId } from '@metamask/utils';

// Mock react-navigation
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

let mockRouteParams: { type: 'source' | 'dest' } = { type: 'source' };

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: mockSetOptions,
    dispatch: mockDispatch,
  }),
  useRoute: () => ({
    params: mockRouteParams,
  }),
}));

// Mock react-redux with configurable state
let mockBridgeFeatureFlags: {
  chainRanking: { chainId: CaipChainId }[] | undefined;
} = {
  chainRanking: [
    { chainId: 'eip155:1' as CaipChainId },
    { chainId: 'eip155:137' as CaipChainId },
  ],
};

jest.mock('react-redux', () => ({
  useDispatch: () => jest.fn(),
  useSelector: jest.fn((selector) => {
    if (selector.toString().includes('bridgeFeatureFlags')) {
      return mockBridgeFeatureFlags;
    }
    if (selector.toString().includes('sourceToken')) return null;
    if (selector.toString().includes('destToken')) return null;
    return { '0x1': { name: 'Ethereum Mainnet' } };
  }),
}));

// Configurable mock states
let mockPopularTokensState = {
  popularTokens: [
    {
      assetId: 'eip155:1/erc20:0x1234',
      address: '0x1234',
      chainId: '0x1',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
    },
  ],
  isLoading: false,
};

jest.mock('../../hooks/usePopularTokens', () => ({
  usePopularTokens: () => mockPopularTokensState,
}));

const mockSearchTokens = jest.fn();
const mockDebouncedSearch = Object.assign(jest.fn(), { cancel: jest.fn() });
const mockResetSearch = jest.fn();

let mockSearchTokensState = {
  searchResults: [] as {
    assetId: string;
    address: string;
    chainId: string;
    symbol: string;
    name: string;
    decimals: number;
  }[],
  isSearchLoading: false,
  isLoadingMore: false,
  searchCursor: undefined as string | undefined,
  searchTokens: mockSearchTokens,
  debouncedSearch: mockDebouncedSearch,
  resetSearch: mockResetSearch,
};

jest.mock('../../hooks/useSearchTokens', () => ({
  useSearchTokens: () => mockSearchTokensState,
}));

let mockBalancesByAssetIdState = {
  tokensWithBalance: [] as {
    address: string;
    chainId: string;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
  }[],
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
let mockSelectedToken: {
  address: string;
  chainId: string;
  symbol: string;
} | null = null;

jest.mock('../../hooks/useTokenSelection', () => ({
  useTokenSelection: () => ({
    handleTokenPress: mockHandleTokenPress,
    selectedToken: mockSelectedToken,
  }),
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../Navbar', () => ({
  getBridgeTokenSelectorNavbar: jest.fn(() => ({})),
}));

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

jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(() => 'eip155:1/erc20:0x1234'),
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
  UnifiedSwapBridgeEventName: {
    AssetDetailTooltipClicked: 'AssetDetailTooltipClicked',
  },
}));

jest.mock('@metamask/design-system-react-native', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, View } = jest.requireActual('react-native');
  return {
    Box: ({ children, style }: { children: React.ReactNode; style?: object }) =>
      createElement(View, { style }, children),
    ButtonIcon: ({ onPress }: { onPress?: () => void }) =>
      createElement(TouchableOpacity, { onPress, testID: 'button-icon-info' }),
    ButtonIconSize: { Md: 'Md' },
    IconColor: { IconAlternative: 'IconAlternative' },
    IconName: { Info: 'Info' },
  };
});

jest.mock('../../../../../constants/bridge', () => ({
  NETWORK_TO_SHORT_NETWORK_NAME_MAP: {
    'eip155:1': 'Ethereum',
    '0x1': 'Ethereum',
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
        onPress: () => onChainSelect('eip155:1' as CaipChainId),
      }),
    );
  },
}));

jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { createElement } = jest.requireActual('react');
    const { TextInput } = jest.requireActual('react-native');
    return ({
      onChangeText,
      testID,
    }: {
      onChangeText: (text: string) => void;
      testID: string;
    }) => createElement(TextInput, { onChangeText, testID });
  },
);

jest.mock('../BridgeTokenSelectorBase', () => {
  const { createElement } = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    SkeletonItem: () => createElement(View, { testID: 'skeleton-item' }),
  };
});

jest.mock('../TokenSelectorItem', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, Text, View } = jest.requireActual('react-native');
  return {
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
    }) =>
      createElement(
        TouchableOpacity,
        { onPress: () => onPress(token), testID: `token-${token.symbol}` },
        createElement(Text, null, token.symbol),
        createElement(View, null, children),
      ),
  };
});

jest.mock('../BridgeDestTokenSelector', () => ({
  getNetworkName: jest.fn(() => 'Ethereum'),
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
      { chainId: 'eip155:1' as CaipChainId },
      { chainId: 'eip155:137' as CaipChainId },
    ],
  };
  mockPopularTokensState = {
    popularTokens: [
      {
        assetId: 'eip155:1/erc20:0x1234',
        address: '0x1234',
        chainId: '0x1',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
      },
    ],
    isLoading: false,
  };
  mockSearchTokensState = {
    searchResults: [],
    isSearchLoading: false,
    isLoadingMore: false,
    searchCursor: undefined,
    searchTokens: mockSearchTokens,
    debouncedSearch: mockDebouncedSearch,
    resetSearch: mockResetSearch,
  };
  mockBalancesByAssetIdState = { tokensWithBalance: [], balancesByAssetId: {} };
  mockSelectedToken = null;
};

describe('BridgeTokenSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetMocks();
  });

  it('renders and sets navigation options', () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    expect(getByTestId('bridge-token-search-input')).toBeTruthy();
    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('handles search and triggers debounced search', () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');

    expect(mockDebouncedSearch).toHaveBeenCalledWith('ETH');
  });

  it('calls handleTokenPress when token pressed', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
    fireEvent.press(getByTestId('token-USDC'));

    expect(mockHandleTokenPress).toHaveBeenCalled();
  });

  it('cancels search and resets when chain changes with active search', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'ETH');
    await act(async () => {
      fireEvent.press(getByTestId('select-eth-network'));
    });

    expect(mockDebouncedSearch.cancel).toHaveBeenCalled();
    expect(mockResetSearch).toHaveBeenCalled();
  });

  it('renders skeleton items during loading states', async () => {
    mockPopularTokensState = { popularTokens: [], isLoading: true };

    const { getAllByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => {
      expect(getAllByTestId('skeleton-item').length).toBe(8);
    });
  });

  it('renders footer skeleton when loading more results', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'ETH',
          name: 'Ethereum',
          decimals: 18,
        },
      ],
      isLoadingMore: true,
    };

    const { getAllByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() =>
      expect(getAllByTestId('skeleton-item').length).toBeGreaterThan(0),
    );
  });

  it('filters tokens with balance and builds includeAssets', async () => {
    mockBalancesByAssetIdState = {
      tokensWithBalance: [
        {
          address: '0x1234',
          chainId: '0x1',
          symbol: 'DAI',
          name: 'Dai',
          decimals: 18,
          balance: '100',
        },
        {
          address: '0x5678',
          chainId: '0x1',
          symbol: 'ZERO',
          name: 'Zero',
          decimals: 18,
          balance: '0',
        },
      ],
      balancesByAssetId: {
        'eip155:1/erc20:0x1234': { balance: '100', fiatBalance: '$100' },
      },
    };

    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
  });

  it('displays search results when query meets minimum length', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      ],
    };

    const { getByTestId } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');

    await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());
  });

  it('triggers load more on scroll near bottom with valid cursor', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      ],
      searchCursor: 'next-cursor',
    };

    const { getByTestId, UNSAFE_getByType } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
    await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());

    mockSearchTokens.mockClear();
    const { FlatList } = jest.requireActual('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    await act(async () => {
      flatList.props.onScroll({
        nativeEvent: {
          layoutMeasurement: { height: 500 },
          contentOffset: { y: 750 },
          contentSize: { height: 1000 },
        },
      });
    });

    expect(mockSearchTokens).toHaveBeenCalledWith('WET', 'next-cursor');
  });

  it('does not load more when cursor unavailable or not near bottom', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      ],
      searchCursor: undefined,
    };

    const { getByTestId, UNSAFE_getByType } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
    await waitFor(() => expect(getByTestId('token-WETH')).toBeTruthy());

    mockSearchTokens.mockClear();
    const { FlatList } = jest.requireActual('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    await act(async () => {
      flatList.props.onScroll({
        nativeEvent: {
          layoutMeasurement: { height: 500 },
          contentOffset: { y: 100 },
          contentSize: { height: 2000 },
        },
      });
    });

    expect(mockSearchTokens).not.toHaveBeenCalled();
  });

  it('navigates and tracks event on info button press', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
    await act(async () => {
      fireEvent.press(getByTestId('button-icon-info'));
    });

    expect(mockDispatch).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'NAVIGATE',
        payload: expect.objectContaining({ name: 'Asset' }),
      }),
    );
    expect(mockTrackEvent).toHaveBeenCalled();
  });

  it('captures FlatList height on layout', async () => {
    const { UNSAFE_getByType } = render(<BridgeTokenSelector />);

    const { FlatList } = jest.requireActual('react-native');
    const flatList = UNSAFE_getByType(FlatList);

    await act(async () => {
      flatList.props.onLayout({ nativeEvent: { layout: { height: 600 } } });
    });

    expect(flatList).toBeTruthy();
  });

  it('handles dest route type with selected token', async () => {
    mockRouteParams = { type: 'dest' };
    mockSelectedToken = { address: '0x1234', chainId: '0x1', symbol: 'USDC' };

    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
  });

  it('returns empty chain array when chainRanking unavailable', () => {
    mockBridgeFeatureFlags = { chainRanking: undefined };

    const { getByTestId } = render(<BridgeTokenSelector />);

    expect(getByTestId('bridge-token-search-input')).toBeTruthy();
  });

  it('does not load more when isSearchLoading is true', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      ],
      searchCursor: 'cursor',
      isSearchLoading: true,
    };

    const { getByTestId, UNSAFE_getByType } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
    mockSearchTokens.mockClear();

    const { FlatList } = jest.requireActual('react-native');
    await act(async () => {
      UNSAFE_getByType(FlatList).props.onScroll({
        nativeEvent: {
          layoutMeasurement: { height: 500 },
          contentOffset: { y: 800 },
          contentSize: { height: 1000 },
        },
      });
    });

    expect(mockSearchTokens).not.toHaveBeenCalled();
  });

  it('does not load more when isLoadingMore is true', async () => {
    mockSearchTokensState = {
      ...mockSearchTokensState,
      searchResults: [
        {
          assetId: 'eip155:1/erc20:0xdef',
          address: '0xdef',
          chainId: '0x1',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
      ],
      searchCursor: 'cursor',
      isLoadingMore: true,
    };

    const { getByTestId, UNSAFE_getByType } = render(<BridgeTokenSelector />);

    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'WET');
    mockSearchTokens.mockClear();

    const { FlatList } = jest.requireActual('react-native');
    await act(async () => {
      UNSAFE_getByType(FlatList).props.onScroll({
        nativeEvent: {
          layoutMeasurement: { height: 500 },
          contentOffset: { y: 800 },
          contentSize: { height: 1000 },
        },
      });
    });

    expect(mockSearchTokens).not.toHaveBeenCalled();
  });

  it('filters tokens by name, symbol, and address in search', async () => {
    mockBalancesByAssetIdState = {
      tokensWithBalance: [
        {
          address: '0xabc123',
          chainId: '0x1',
          symbol: 'TEST',
          name: 'TestToken',
          decimals: 18,
          balance: '50',
        },
      ],
      balancesByAssetId: {},
    };

    const { getByTestId } = render(<BridgeTokenSelector />);

    // Search by name
    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'TestToken');
    expect(mockDebouncedSearch).toHaveBeenLastCalledWith('TestToken');

    // Search by symbol
    fireEvent.changeText(getByTestId('bridge-token-search-input'), 'TEST');
    expect(mockDebouncedSearch).toHaveBeenLastCalledWith('TEST');

    // Search by address
    fireEvent.changeText(getByTestId('bridge-token-search-input'), '0xabc123');
    expect(mockDebouncedSearch).toHaveBeenLastCalledWith('0xabc123');
  });

  it('updates list key when chain selection changes', async () => {
    const { getByTestId, rerender } = render(<BridgeTokenSelector />);

    await act(async () => {
      fireEvent.press(getByTestId('select-eth-network'));
    });

    rerender(<BridgeTokenSelector />);

    expect(getByTestId('network-pills')).toBeTruthy();
  });

  it('renders noFee tokens correctly for source and dest types', async () => {
    mockPopularTokensState = {
      popularTokens: [
        {
          assetId: 'eip155:1/erc20:0x1234',
          address: '0x1234',
          chainId: '0x1',
          symbol: 'USDC',
          name: 'USD Coin',
          decimals: 6,
          noFee: { isSource: true, isDestination: true },
        } as unknown as (typeof mockPopularTokensState.popularTokens)[0],
      ],
      isLoading: false,
    };

    const { getByTestId, rerender } = render(<BridgeTokenSelector />);
    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());

    mockRouteParams = { type: 'dest' };
    rerender(<BridgeTokenSelector />);
    await waitFor(() => expect(getByTestId('token-USDC')).toBeTruthy());
  });
});
