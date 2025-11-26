import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { BridgeTokenSelector } from './BridgeTokenSelector';
import { CaipChainId } from '@metamask/utils';

// Mock react-navigation
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockSetOptions = jest.fn();
const mockDispatch = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
    setOptions: mockSetOptions,
    dispatch: mockDispatch,
  }),
  useRoute: () => ({
    params: { type: 'source' },
  }),
}));

// Mock react-redux
const mockReduxDispatch = jest.fn();
jest.mock('react-redux', () => ({
  useDispatch: () => mockReduxDispatch,
  useSelector: jest.fn((selector) => {
    // Mock selectBridgeFeatureFlags
    if (selector.toString().includes('bridgeFeatureFlags')) {
      return {
        chainRanking: [
          { chainId: 'eip155:1' as CaipChainId },
          { chainId: 'eip155:137' as CaipChainId },
        ],
      };
    }
    // Mock selectSourceToken
    if (selector.toString().includes('sourceToken')) {
      return null;
    }
    // Mock selectDestToken
    if (selector.toString().includes('destToken')) {
      return null;
    }
    // Mock selectNetworkConfigurations
    return {
      '0x1': { name: 'Ethereum Mainnet' },
      '0x89': { name: 'Polygon' },
    };
  }),
}));

// Mock custom hooks
jest.mock('../../hooks/usePopularTokens', () => ({
  usePopularTokens: () => ({
    popularTokens: [
      {
        assetId: 'eip155:1/erc20:0x1234',
        chainId: 'eip155:1',
        symbol: 'USDC',
        name: 'USD Coin',
        decimals: 6,
        image: 'https://example.com/usdc.png',
      },
    ],
    isLoading: false,
  }),
}));

jest.mock('../../hooks/useSearchTokens', () => ({
  useSearchTokens: () => ({
    searchResults: [],
    isSearchLoading: false,
    isLoadingMore: false,
    searchCursor: undefined,
    searchTokens: jest.fn(),
    debouncedSearch: Object.assign(jest.fn(), { cancel: jest.fn() }),
    resetSearch: jest.fn(),
  }),
}));

jest.mock('../../hooks/useBalancesByAssetId', () => ({
  useBalancesByAssetId: () => ({
    tokensWithBalance: [],
    balancesByAssetId: {},
  }),
}));

jest.mock('../../hooks/useTokensWithBalances', () => ({
  useTokensWithBalances: (tokens: Record<string, unknown>[]) =>
    tokens.map((token) => ({
      ...token,
      address: '0x1234',
      chainId: '0x1',
    })),
}));

const mockHandleTokenPress = jest.fn();
jest.mock('../../hooks/useTokenSelection', () => ({
  useTokenSelection: () => ({
    handleTokenPress: mockHandleTokenPress,
    selectedToken: null,
  }),
}));

// Mock i18n
jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'swaps.search_token': 'Search token',
      'bridge.all': 'All',
    };
    return translations[key] || key;
  },
}));

// Mock Navbar
jest.mock('../../../Navbar', () => ({
  getBridgeTokenSelectorNavbar: jest.fn(() => ({})),
}));

// Mock Engine
jest.mock('../../../../../core/Engine', () => ({
  context: {
    BridgeController: {
      trackUnifiedSwapBridgeEvent: jest.fn(),
    },
  },
}));

// Mock useStyles
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

// Mock bridge-controller
jest.mock('@metamask/bridge-controller', () => ({
  formatAddressToAssetId: jest.fn(() => 'eip155:1/erc20:0x1234'),
  formatChainIdToCaip: jest.fn(
    (chainId: string) => `eip155:${parseInt(chainId, 16)}`,
  ),
  UnifiedSwapBridgeEventName: {
    AssetDetailTooltipClicked: 'AssetDetailTooltipClicked',
  },
}));

// Mock design system
jest.mock('@metamask/design-system-react-native', () => ({
  Box: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  ButtonIcon: () => <></>,
  ButtonIconSize: { Md: 'Md' },
  IconColor: { IconAlternative: 'IconAlternative' },
  IconName: { Info: 'Info' },
}));

// Mock bridge constants
jest.mock('../../../../../constants/bridge', () => ({
  NETWORK_TO_SHORT_NETWORK_NAME_MAP: {
    'eip155:1': 'Ethereum',
    '0x1': 'Ethereum',
  },
}));

// Mock util functions
jest.mock('../../../../../util/networks', () => ({
  getNetworkImageSource: jest.fn(() => ({ uri: 'https://network.png' })),
}));

// Mock NetworkPills component
jest.mock('./NetworkPills', () => ({
  NetworkPills: () => <></>,
}));

// Mock TextFieldSearch
jest.mock(
  '../../../../../component-library/components/Form/TextFieldSearch',
  () => {
    const { createElement } = jest.requireActual('react');
    const { TextInput } = jest.requireActual('react-native');
    return ({
      onChangeText,
      placeholder,
      testID,
    }: {
      onChangeText: (text: string) => void;
      placeholder: string;
      testID: string;
    }) =>
      createElement(TextInput, {
        onChangeText,
        placeholder,
        testID,
      });
  },
);

// Mock SkeletonItem
jest.mock('../BridgeTokenSelectorBase', () => ({
  SkeletonItem: () => <></>,
}));

// Mock TokenSelectorItem
jest.mock('../TokenSelectorItem', () => {
  const { createElement } = jest.requireActual('react');
  const { TouchableOpacity, Text } = jest.requireActual('react-native');
  return {
    TokenSelectorItem: ({
      token,
      onPress,
      children,
    }: {
      token: { symbol: string };
      onPress: () => void;
      children?: React.ReactNode;
    }) =>
      createElement(
        TouchableOpacity,
        { onPress, testID: `token-${token.symbol}` },
        createElement(Text, null, token.symbol),
        children,
      ),
  };
});

// Mock BridgeDestTokenSelector
jest.mock('../BridgeDestTokenSelector', () => ({
  getNetworkName: jest.fn(() => 'Ethereum'),
}));

// Mock safe-area-context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

// Mock gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const { FlatList, ScrollView } = jest.requireActual('react-native');
  return { FlatList, ScrollView };
});

describe('BridgeTokenSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders search input', () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    expect(getByTestId('bridge-token-search-input')).toBeTruthy();
  });

  it('renders token list', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => {
      expect(getByTestId('token-USDC')).toBeTruthy();
    });
  });

  it('sets navigation options on mount', () => {
    render(<BridgeTokenSelector />);

    expect(mockSetOptions).toHaveBeenCalled();
  });

  it('handles search text change', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    const searchInput = getByTestId('bridge-token-search-input');
    fireEvent.changeText(searchInput, 'USDC');

    // Verify input exists and accepts text
    expect(searchInput).toBeTruthy();
  });

  it('calls handleTokenPress when token is pressed', async () => {
    const { getByTestId } = render(<BridgeTokenSelector />);

    await waitFor(() => {
      expect(getByTestId('token-USDC')).toBeTruthy();
    });

    const tokenItem = getByTestId('token-USDC');
    fireEvent.press(tokenItem);

    expect(mockHandleTokenPress).toHaveBeenCalled();
  });
});
