import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import OndoCampaignRwaSelectorView from './OndoCampaignRwaSelectorView';
import type { TrendingAsset } from '@metamask/assets-controllers';

const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({
    params: {
      mode: 'open_position',
      campaignId: 'campaign-1',
      srcTokenUnits: '1',
    },
  }),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const actual = jest.requireActual('react-native-safe-area-context');
  return {
    ...actual,
    useSafeAreaInsets: jest.fn(() => ({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    })),
    SafeAreaView: ({
      children,
      testID,
      ...props
    }: {
      children: React.ReactNode;
      testID?: string;
    }) => ReactActual.createElement(View, { ...props, testID }, children),
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => ({
  useTailwind: () => {
    const tw = () => ({});
    tw.style = (..._args: unknown[]) => ({});
    return tw;
  },
}));

jest.mock(
  '../../../../component-library/components-temp/HeaderCompactStandard',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View, Pressable } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        title,
        onBack,
      }: {
        title: React.ReactNode;
        onBack: () => void;
      }) =>
        ReactActual.createElement(
          View,
          { testID: 'header' },
          ReactActual.createElement(Pressable, {
            onPress: onBack,
            testID: 'header-back-button',
          }),
          typeof title === 'string'
            ? ReactActual.createElement(
                jest.requireActual('react-native').Text,
                { testID: 'header-title' },
                title,
              )
            : title,
        ),
    };
  },
);

jest.mock('../../../Views/ErrorBoundary', () => {
  const ReactActual = jest.requireActual('react');
  return {
    __esModule: true,
    default: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

const mockUseRwaTokens = jest.fn();
jest.mock('../../Trending/hooks/useRwaTokens/useRwaTokens', () => ({
  useRwaTokens: (...args: unknown[]) => mockUseRwaTokens(...args),
}));

jest.mock('../../Bridge/hooks/useSwapBridgeNavigation', () => ({
  useSwapBridgeNavigation: () => ({ goToSwaps: mockGoToSwaps }),
  SwapBridgeNavigationLocation: { Rewards: 'Rewards' },
}));

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../util/caip', () => ({
  caipChainIdToHex: jest.fn(() => '0x1'),
}));

jest.mock('../../Trending/components/FilterBar/FilterBar', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity, Text } = jest.requireActual('react-native');
  const FilterButton = ({
    testID,
    label,
    onPress,
  }: {
    testID: string;
    label: string;
    onPress: () => void;
  }) =>
    ReactActual.createElement(
      TouchableOpacity,
      { testID, onPress },
      ReactActual.createElement(Text, null, label),
    );
  const FilterBar = ({
    priceChangeButtonText,
    onPriceChangePress,
    extraFilters,
  }: {
    priceChangeButtonText: string;
    onPriceChangePress: () => void;
    extraFilters?: React.ReactNode;
  }) =>
    ReactActual.createElement(
      View,
      { testID: 'filter-bar' },
      ReactActual.createElement(
        TouchableOpacity,
        { testID: 'price-change-button', onPress: onPriceChangePress },
        ReactActual.createElement(Text, null, priceChangeButtonText),
      ),
      extraFilters,
    );
  FilterBar.displayName = 'FilterBar';
  return { __esModule: true, default: FilterBar, FilterButton };
});

jest.mock(
  '../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem',
  () => {
    const ReactActual = jest.requireActual('react');
    const { TouchableOpacity, Text } = jest.requireActual('react-native');
    return {
      __esModule: true,
      default: ({
        token,
        onPress,
      }: {
        token: TrendingAsset;
        onPress: (t: TrendingAsset) => void;
      }) =>
        ReactActual.createElement(
          TouchableOpacity,
          {
            testID: `token-row-${token.symbol}`,
            onPress: () => onPress(token),
          },
          ReactActual.createElement(Text, null, token.symbol),
        ),
    };
  },
);

jest.mock(
  '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenPriceChangeBottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      TrendingTokenPriceChangeBottomSheet: () =>
        ReactActual.createElement(View, {
          testID: 'price-change-bottom-sheet',
        }),
      PriceChangeOption: {
        PriceChange: 'PriceChange',
        Volume: 'Volume',
        MarketCap: 'MarketCap',
      },
      SortDirection: { Ascending: 'Ascending', Descending: 'Descending' },
    };
  },
);

jest.mock(
  '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet',
  () => {
    const ReactActual = jest.requireActual('react');
    const { View } = jest.requireActual('react-native');
    return {
      __esModule: true,
      TrendingTokenTimeBottomSheet: () =>
        ReactActual.createElement(View, { testID: 'time-bottom-sheet' }),
      TimeOption: { TwentyFourHours: '24H', OneWeek: '1W', OneMonth: '1M' },
    };
  },
);

// Silence utility mocks
jest.mock('../../Trending/utils/getTrendingTokenImageUrl', () => ({
  getTrendingTokenImageUrl: jest.fn(() => 'https://mock.image'),
}));

jest.mock('../../Ramp/Aggregator/utils/parseCaip19AssetId', () => ({
  parseCAIP19AssetId: jest.fn(() => ({
    namespace: 'eip155',
    chainId: '1',
    assetReference: '0xabc',
  })),
}));

jest.mock('../../../../util/networks', () => ({
  getDefaultNetworkByChainId: jest.fn(() => ({ name: 'Ethereum' })),
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { muted: 'muted-text' },
      border: { muted: 'muted-border' },
    },
  }),
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

const buildToken = (symbol: string, assetId?: string): TrendingAsset =>
  ({
    symbol,
    name: `${symbol} Token`,
    decimals: 18,
    assetId: assetId ?? `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    rwaData: null,
  }) as unknown as TrendingAsset;

describe('OndoCampaignRwaSelectorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    expect(getByTestId('header')).toBeDefined();
  });

  it('renders skeleton when loading', () => {
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: true });
    const { queryByTestId } = render(<OndoCampaignRwaSelectorView />);
    // When loading, FlatList is replaced by skeleton boxes — no token rows rendered
    expect(queryByTestId('token-row-AAPL')).toBeNull();
  });

  it('renders empty state when no tokens and not loading', () => {
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
    const { getByText } = render(<OndoCampaignRwaSelectorView />);
    expect(
      getByText('rewards.ondo_rwa_asset_selector.no_results'),
    ).toBeDefined();
  });

  it('renders token list items when tokens are available', () => {
    mockUseRwaTokens.mockReturnValue({
      data: [buildToken('AAPL'), buildToken('MSFT')],
      isLoading: false,
    });
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    expect(getByTestId('token-row-AAPL')).toBeDefined();
    expect(getByTestId('token-row-MSFT')).toBeDefined();
  });

  it('in open_position mode, shows plain title string', () => {
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
    const { getByText } = render(<OndoCampaignRwaSelectorView />);
    expect(
      getByText('rewards.ondo_rwa_asset_selector.title_open_position'),
    ).toBeDefined();
  });

  it('calls goToSwaps when a token item is pressed', () => {
    const token = buildToken('AAPL');
    mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    fireEvent.press(getByTestId('token-row-AAPL'));
    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    fireEvent.press(getByTestId('header-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  it('renders the filter bar', () => {
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    expect(getByTestId('filter-bar')).toBeDefined();
  });
});
