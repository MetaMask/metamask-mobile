import React from 'react';
import { fireEvent, waitFor, act } from '@testing-library/react-native';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import TrendingTokensFullView from './TrendingTokensFullView';
import type { TrendingAsset } from '@metamask/assets-controllers';

const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    goBack: mockGoBack,
  }),
  createNavigatorFactory: () => ({}),
}));

const mockUseTrendingRequest = jest.fn();
jest.mock('../../../UI/Assets/hooks/useTrendingRequest', () => ({
  useTrendingRequest: (options: unknown) => mockUseTrendingRequest(options),
}));

jest.mock(
  '../TrendingTokensSection/TrendingTokensList/TrendingTokensList',
  () => {
    const { View, Text } = jest.requireActual('react-native');
    return ({
      trendingTokens,
      onTokenPress,
    }: {
      trendingTokens: TrendingAsset[];
      onTokenPress: (token: TrendingAsset) => void;
    }) => (
      <View testID="trending-tokens-list">
        {trendingTokens.map((token, index) => (
          <View
            key={token.assetId || index}
            testID={`token-${index}`}
            onTouchEnd={() => onTokenPress(token)}
          >
            <Text>{token.name}</Text>
          </View>
        ))}
      </View>
    );
  },
);

jest.mock(
  '../TrendingTokensSection/TrendingTokenSkeleton/TrendingTokensSkeleton',
  () => {
    const { View } = jest.requireActual('react-native');
    return ({ count }: { count: number }) => (
      <View testID="trending-tokens-skeleton" data-count={count} />
    );
  },
);

jest.mock('../../../../util/navigation/navUtils', () => ({
  createNavigationDetails: jest.fn(
    (stackId, screenName) => (params?: unknown) => [
      stackId,
      { screen: screenName, params },
    ],
  ),
}));

jest.mock('../TrendingTokensBottomSheet', () => ({
  createTrendingTokenTimeBottomSheetNavDetails: (params?: unknown) => [
    'MODAL_ROOT',
    { screen: 'TrendingTokenTimeBottomSheet', params },
  ],
  createTrendingTokenNetworkBottomSheetNavDetails: (params?: unknown) => [
    'MODAL_ROOT',
    { screen: 'TrendingTokenNetworkBottomSheet', params },
  ],
  createTrendingTokenPriceChangeBottomSheetNavDetails: (params?: unknown) => [
    'MODAL_ROOT',
    { screen: 'TrendingTokenPriceChangeBottomSheet', params },
  ],
  TimeOption: {
    TwentyFourHours: '24h',
    SixHours: '6h',
    OneHour: '1h',
    FiveMinutes: '5m',
  },
  PriceChangeOption: {
    PriceChange: 'price_change',
    Volume: 'volume',
    MarketCap: 'market_cap',
  },
  SortDirection: {
    Ascending: 'ascending',
    Descending: 'descending',
  },
}));

jest.mock('../../../../component-library/components/HeaderBase', () => {
  const { View } = jest.requireActual('react-native');
  const MockHeaderBase = ({
    children,
    startAccessory,
    endAccessory,
  }: {
    children: React.ReactNode;
    startAccessory?: React.ReactNode;
    endAccessory?: React.ReactNode;
  }) => (
    <View testID="header-base">
      {startAccessory}
      {children}
      {endAccessory}
    </View>
  );
  return {
    __esModule: true,
    default: MockHeaderBase,
    HeaderBaseVariant: {
      Display: 'display',
      Compact: 'compact',
    },
  };
});

jest.mock('../../../../component-library/components/Buttons/ButtonIcon', () => {
  const { TouchableOpacity } = jest.requireActual('react-native');
  const MockButtonIcon = ({
    onPress,
    testID,
  }: {
    onPress?: () => void;
    testID?: string;
  }) => (
    <TouchableOpacity testID={testID} onPress={onPress}>
      ButtonIcon
    </TouchableOpacity>
  );
  return {
    __esModule: true,
    default: MockButtonIcon,
    ButtonIconSizes: {
      Sm: '24',
      Md: '28',
      Lg: '32',
    },
  };
});

jest.mock('../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: Text,
    TextVariant: {
      HeadingMD: 'HeadingMD',
    },
    TextColor: {
      Default: 'Default',
    },
  };
});

jest.mock('../../../../component-library/components/Icons/Icon', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: function MockIcon({ name }: { name: string }) {
      return <View testID={`icon-${name}`}>{name}</View>;
    },
    IconName: {
      ArrowLeft: 'ArrowLeft',
      Search: 'Search',
      ArrowDown: 'ArrowDown',
    },
    IconColor: {
      Alternative: 'Alternative',
    },
    IconSize: {
      Xs: 'Xs',
    },
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => {
    const translations: Record<string, string> = {
      'trending.trending_tokens': 'Trending Tokens',
      'trending.price_change': 'Price change',
      'trending.all_networks': 'All networks',
      'trending.24h': '24h',
    };
    return translations[key] || key;
  },
}));

const createMockToken = (
  overrides: Partial<TrendingAsset> = {},
): TrendingAsset => ({
  assetId: 'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  name: 'USD Coin',
  symbol: 'USDC',
  decimals: 6,
  price: '1.00135763432467',
  aggregatedUsdVolume: 974248822.2,
  marketCap: 75641301011.76,
  priceChangePct: {
    h24: '3.44',
  },
  ...overrides,
});

describe('TrendingTokensFullView', () => {
  const mockState = {
    engine: {
      backgroundState: {
        NetworkController: {
          networkConfigurations: {},
          networkConfigurationsByChainId: {},
        },
        MultichainNetworkController: {
          selectedMultichainNetworkChainId: undefined,
          multichainNetworkConfigurationsByChainId: {},
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });
  });

  it('renders header with title and buttons', () => {
    const { getByText, getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false, // Exclude NavigationContainer since we're mocking navigation
    );

    expect(getByText('Trending Tokens')).toBeTruthy();
    expect(getByTestId('back-button')).toBeTruthy();
    expect(getByTestId('search-button')).toBeTruthy();
  });

  it('renders control buttons', () => {
    const { getByTestId, getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('price-change-button')).toBeTruthy();
    expect(getByTestId('all-networks-button')).toBeTruthy();
    expect(getByTestId('24h-button')).toBeTruthy();
    expect(getByText('Price change')).toBeTruthy();
    expect(getByText('All networks')).toBeTruthy();
    expect(getByText('24h')).toBeTruthy();
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const backButton = getByTestId('back-button');
    fireEvent.press(backButton);

    expect(mockGoBack).toHaveBeenCalled();
  });

  it('navigates to time bottom sheet when 24h button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const button24h = getByTestId('24h-button');
    fireEvent.press(button24h);

    expect(mockNavigate).toHaveBeenCalledWith(
      'MODAL_ROOT',
      expect.objectContaining({
        screen: 'TrendingTokenTimeBottomSheet',
        params: expect.objectContaining({
          onTimeSelect: expect.any(Function),
          selectedTime: '24h',
        }),
      }),
    );
  });

  it('navigates to network bottom sheet when all networks button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const allNetworksButton = getByTestId('all-networks-button');
    fireEvent.press(allNetworksButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'MODAL_ROOT',
      expect.objectContaining({
        screen: 'TrendingTokenNetworkBottomSheet',
        params: expect.objectContaining({
          onNetworkSelect: expect.any(Function),
          selectedNetwork: null,
        }),
      }),
    );
  });

  it('navigates to price change bottom sheet when price change button is pressed', () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const priceChangeButton = getByTestId('price-change-button');
    fireEvent.press(priceChangeButton);

    expect(mockNavigate).toHaveBeenCalledWith(
      'MODAL_ROOT',
      expect.objectContaining({
        screen: 'TrendingTokenPriceChangeBottomSheet',
        params: expect.objectContaining({
          onPriceChangeSelect: expect.any(Function),
          selectedOption: 'price_change',
          sortDirection: 'descending',
        }),
      }),
    );
  });

  it('displays skeleton loader when loading', () => {
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: true,
      error: null,
      fetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('trending-tokens-skeleton')).toBeTruthy();
  });

  it('displays skeleton loader when results are empty', () => {
    mockUseTrendingRequest.mockReturnValue({
      results: [],
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });

    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('trending-tokens-skeleton')).toBeTruthy();
  });

  it('displays trending tokens list when data is loaded', () => {
    const mockTokens = [
      createMockToken({ name: 'Token 1', assetId: 'eip155:1/erc20:0x123' }),
      createMockToken({ name: 'Token 2', assetId: 'eip155:1/erc20:0x456' }),
    ];

    mockUseTrendingRequest.mockReturnValue({
      results: mockTokens,
      isLoading: false,
      error: null,
      fetch: jest.fn(),
    });

    const { getByTestId, getByText } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    expect(getByTestId('trending-tokens-list')).toBeTruthy();
    expect(getByText('Token 1')).toBeTruthy();
    expect(getByText('Token 2')).toBeTruthy();
  });

  it('calls useTrendingRequest with correct initial parameters', () => {
    renderWithProvider(<TrendingTokensFullView />, { state: mockState }, false);

    expect(mockUseTrendingRequest).toHaveBeenCalledWith({
      sortBy: undefined,
      chainIds: undefined,
    });
  });

  it('updates sortBy when time option is selected', async () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const button24h = getByTestId('24h-button');
    fireEvent.press(button24h);

    const navigateCall = mockNavigate.mock.calls.find(
      (call) => call[1]?.screen === 'TrendingTokenTimeBottomSheet',
    );
    expect(navigateCall).toBeTruthy();

    const onTimeSelect = navigateCall?.[1]?.params?.onTimeSelect;
    if (onTimeSelect) {
      await act(async () => {
        onTimeSelect('h6_trending' as never, '6h' as never);
      });
    }

    await waitFor(() => {
      expect(mockUseTrendingRequest).toHaveBeenLastCalledWith({
        sortBy: 'h6_trending',
        chainIds: undefined,
      });
    });
  });

  it('updates chainIds when network is selected', async () => {
    const { getByTestId } = renderWithProvider(
      <TrendingTokensFullView />,
      { state: mockState },
      false,
    );

    const allNetworksButton = getByTestId('all-networks-button');
    fireEvent.press(allNetworksButton);

    const navigateCall = mockNavigate.mock.calls.find(
      (call) => call[1]?.screen === 'TrendingTokenNetworkBottomSheet',
    );
    expect(navigateCall).toBeTruthy();

    const onNetworkSelect = navigateCall?.[1]?.params?.onNetworkSelect;
    if (onNetworkSelect) {
      await act(async () => {
        onNetworkSelect(['eip155:1']);
      });
    }

    await waitFor(() => {
      expect(mockUseTrendingRequest).toHaveBeenLastCalledWith({
        sortBy: undefined,
        chainIds: ['eip155:1'],
      });
    });
  });
});
