import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoCampaignRwaSelectorView, {
  getOndoOpenPositionSourceToken,
} from './OndoCampaignRwaSelectorView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useAnalytics } from '../../../hooks/useAnalytics/useAnalytics';
import {
  createMockUseAnalyticsHook,
  createMockEventBuilder,
} from '../../../../util/test/analyticsMock';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import { selectSelectedAccountGroupInternalAccounts } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllTokenBalances } from '../../../../selectors/tokenBalancesController';

const mockGoBack = jest.fn();
const mockGoToSwaps = jest.fn();

let mockRouteParams: {
  mode: 'open_position' | 'swap';
  campaignId: string;
  srcTokenAsset?: string;
  srcTokenSymbol?: string;
  srcTokenName?: string;
  srcTokenDecimals?: number;
} = { mode: 'open_position', campaignId: 'campaign-1' };

jest.mock('react-redux', () => ({ useSelector: jest.fn() }));

jest.mock(
  '../../../../selectors/multichainAccounts/accountTreeController',
  () => ({
    selectSelectedAccountGroupInternalAccounts: jest.fn(),
  }),
);

jest.mock('../../../../selectors/tokenBalancesController', () => ({
  selectAllTokenBalances: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack, navigate: jest.fn() }),
  useRoute: () => ({ params: mockRouteParams }),
  StackActions: { push: jest.fn() },
}));

jest.mock('@react-navigation/stack', () => ({
  ...jest.requireActual('@react-navigation/stack'),
}));

jest.mock('@metamask/design-system-react-native', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Actual = jest.requireActual('@metamask/design-system-react-native');
  const stub = () => ReactActual.createElement(View, null);
  return {
    ...Actual,
    Icon: stub,
    Skeleton: stub,
  };
});

jest.mock('@metamask/design-system-twrnc-preset', () => {
  const { Theme } = jest.requireActual('@metamask/design-system-twrnc-preset');
  const tw = Object.assign(() => ({}), {
    style: (..._args: unknown[]) => ({}),
  });
  return {
    Theme,
    useTailwind: () => tw,
    useTheme: () => Theme.Light,
  };
});

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

let mockIsTokenTradingOpen = jest.fn(() => true);

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: jest.fn(() => false),
    isTokenTradingOpen: mockIsTokenTradingOpen,
  }),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics');

jest.mock('../components/Campaigns/OndoAfterHoursSheet', () => {
  const ReactActual = jest.requireActual('react');
  const { View, TouchableOpacity } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      onClose,
      onConfirm,
    }: {
      onClose: () => void;
      onConfirm: () => void;
      nextOpenAt: Date | null;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'after-hours-sheet' },
        ReactActual.createElement(TouchableOpacity, {
          testID: 'after-hours-close',
          onPress: onClose,
        }),
        ReactActual.createElement(TouchableOpacity, {
          testID: 'after-hours-confirm',
          onPress: onConfirm,
        }),
      ),
  };
});

jest.mock('../../../../../locales/i18n', () => ({
  strings: (key: string) => key,
}));

jest.mock('../../../../core/Analytics', () => ({
  MetaMetricsEvents: {
    REWARDS_PAGE_BUTTON_CLICKED: 'REWARDS_PAGE_BUTTON_CLICKED',
    REWARDS_PAGE_VIEWED: 'REWARDS_PAGE_VIEWED',
  },
}));

jest.mock('../utils/formatUtils', () => ({
  ...jest.requireActual('../utils/formatUtils'),
  parseCaip19: jest.fn((assetId: string) => {
    const [chainId, assetPath] = assetId.split('/');
    const [namespace, chainReference] = chainId.split(':');
    const [, assetReference] = assetPath.split(':');
    return {
      namespace,
      chainId: chainReference,
      assetReference,
    };
  }),
  caipChainIdToHex: jest.fn((caipChainId: string) =>
    caipChainId === 'eip155:56' ? '0x38' : '0x1',
  ),
}));

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
          ReactActual.createElement(Text, null, token.name),
        ),
    };
  },
);

jest.mock('../../Trending/utils/getTrendingTokenImageUrl', () => ({
  getTrendingTokenImageUrl: jest.fn(
    (assetId: string) => `https://mock.image/${assetId}`,
  ),
}));

jest.mock('../../Trending/utils/trendingNetworksList', () => ({
  RWA_NETWORKS_LIST: [
    { caipChainId: 'eip155:1', name: 'Ethereum' },
    { caipChainId: 'eip155:56', name: 'BNB Chain' },
  ],
}));

jest.mock('../../Trending/hooks/useNetworkName/useNetworkName', () => ({
  useNetworkName: () => 'All networks',
}));

jest.mock('../../Trending/services/TrendingFeedSessionManager', () => ({
  __esModule: true,
  default: {
    getInstance: () => ({
      trackFilterChange: jest.fn(),
    }),
  },
}));

jest.mock('../../../../util/theme', () => ({
  useTheme: () => ({
    colors: {
      text: { muted: 'muted-text' },
      border: { muted: 'muted-border' },
    },
  }),
  useAppThemeFromContext: () => ({}),
}));

jest.mock('../../AssetOverview/Balance/Balance', () => ({
  NetworkBadgeSource: jest.fn(() => ({ uri: 'https://mock.icon' })),
}));

jest.mock('../../../../component-library/components/Avatars/Avatar', () => ({
  AvatarSize: { Xs: 'xs', Sm: 'sm', Md: 'md', Lg: 'lg', Xl: 'xl' },
}));

jest.mock('../../../../component-library/components/Badges/Badge', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
    BadgeVariant: { Network: 'Network' },
  };
});

jest.mock('../../Trending/components/TrendingTokenLogo', () => {
  const ReactActual = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: () => ReactActual.createElement(View, null),
  };
});

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: jest.requireActual('react-native').View,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock FilterBar
jest.mock('../../Trending/components/FilterBar/FilterBar', () => {
  const ReactActual = jest.requireActual('react');
  const { View, Pressable, Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({
      networkName,
      onNetworkPress,
      priceChangeButtonText,
      onPriceChangePress,
    }: {
      networkName: string;
      onNetworkPress: () => void;
      priceChangeButtonText: string;
      onPriceChangePress: () => void;
      isPriceChangeDisabled?: boolean;
    }) =>
      ReactActual.createElement(
        View,
        { testID: 'filter-bar' },
        ReactActual.createElement(
          Pressable,
          { testID: 'all-networks-button', onPress: onNetworkPress },
          ReactActual.createElement(Text, null, networkName),
        ),
        ReactActual.createElement(
          Pressable,
          { testID: 'price-change-button', onPress: onPriceChangePress },
          ReactActual.createElement(Text, null, priceChangeButtonText),
        ),
      ),
  };
});

// Mock bottom sheets as no-ops for rendering
jest.mock('../../Trending/components/TrendingTokensBottomSheet', () => ({
  PriceChangeOption: {
    PriceChange: 'price_change',
    Volume: 'volume',
    MarketCap: 'market_cap',
  },
  TimeOption: { TwentyFourHours: '24H', OneWeek: '1W', OneMonth: '1M' },
  SortDirection: { Ascending: 'asc', Descending: 'desc' },
  TrendingTokenNetworkBottomSheet: () => null,
  TrendingTokenPriceChangeBottomSheet: () => null,
}));

const buildToken = (symbol: string, assetId?: string): TrendingAsset =>
  ({
    symbol,
    name: `${symbol} Token`,
    decimals: 18,
    assetId: assetId ?? `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    rwaData: null,
  }) as unknown as TrendingAsset;

let mockActiveGroupAccounts: { address: string }[] = [];
let mockAllTokenBalances: Record<
  string,
  Record<string, Record<string, string>>
> = {};

describe('OndoCampaignRwaSelectorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
    mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
    mockIsTokenTradingOpen = jest.fn(() => true);
    jest.mocked(useAnalytics).mockReturnValue(
      createMockUseAnalyticsHook({
        trackEvent: mockTrackEvent,
        createEventBuilder: mockCreateEventBuilder,
      }),
    );
    mockActiveGroupAccounts = [];
    mockAllTokenBalances = {};
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectSelectedAccountGroupInternalAccounts)
        return mockActiveGroupAccounts;
      if (selector === selectAllTokenBalances) return mockAllTokenBalances;
      return undefined;
    });
  });

  it('renders without crashing', () => {
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    expect(getByTestId('ondo-rwa-selector-header')).toBeDefined();
  });

  it('renders skeleton when loading', () => {
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: true });
    const { queryByTestId } = render(<OndoCampaignRwaSelectorView />);
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

  it('calls goToSwaps when a token item is pressed', () => {
    const token = buildToken('AAPL');
    mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    fireEvent.press(getByTestId('token-row-AAPL'));
    expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
  });

  it('navigates back when back button is pressed', () => {
    const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
    fireEvent.press(getByTestId('ondo-rwa-selector-header-back-button'));
    expect(mockGoBack).toHaveBeenCalledTimes(1);
  });

  describe('filter bar', () => {
    it('shows filter bar with network and price-change buttons in open_position mode', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      expect(getByTestId('filter-bar')).toBeDefined();
      expect(getByTestId('all-networks-button')).toBeDefined();
      expect(getByTestId('price-change-button')).toBeDefined();
    });

    it('shows filter bar in swap mode', () => {
      mockRouteParams = {
        mode: 'swap',
        campaignId: 'campaign-1',
        srcTokenAsset: 'eip155:1/erc20:0xabc',
        srcTokenSymbol: 'USDC',
        srcTokenDecimals: 6,
      };
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      expect(getByTestId('filter-bar')).toBeDefined();
    });

    it('defaults to Ethereum chainId in open_position mode', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      render(<OndoCampaignRwaSelectorView />);
      const lastCall =
        mockUseRwaTokens.mock.calls[mockUseRwaTokens.mock.calls.length - 1][0];
      expect(lastCall.chainIds).toEqual(['eip155:1']);
    });
  });

  describe('swap mode', () => {
    beforeEach(() => {
      mockRouteParams = {
        mode: 'swap',
        campaignId: 'campaign-1',
        srcTokenAsset: 'eip155:1/erc20:0xabc',
        srcTokenSymbol: 'USDC',
        srcTokenName: 'USD Coin',
        srcTokenDecimals: 6,
      };
    });

    it('renders swap prefix title when srcTokenAsset and srcTokenSymbol are provided', () => {
      const { getByText } = render(<OndoCampaignRwaSelectorView />);
      expect(
        getByText('rewards.ondo_rwa_asset_selector.title_swap_prefix'),
      ).toBeDefined();
    });

    it('does not show the open_position title in swap mode', () => {
      const { queryByText } = render(<OndoCampaignRwaSelectorView />);
      expect(
        queryByText('rewards.ondo_rwa_asset_selector.title_open_position'),
      ).toBeNull();
    });

    it('uppercases the source symbol in the title', () => {
      mockRouteParams = {
        ...mockRouteParams,
        srcTokenSymbol: 'NIOon',
      };
      const { getByText } = render(<OndoCampaignRwaSelectorView />);
      expect(getByText('NIOON')).toBeDefined();
    });

    it('excludes the source token from the destination list by CAIP-19 assetId', () => {
      const srcAssetId = 'eip155:1/erc20:0xabc';
      mockRouteParams = {
        mode: 'swap',
        campaignId: 'campaign-1',
        srcTokenAsset: srcAssetId,
        srcTokenSymbol: 'NIOon',
        srcTokenDecimals: 18,
      };
      mockUseRwaTokens.mockReturnValue({
        data: [
          buildToken('NIOon', srcAssetId),
          buildToken('AAPL', 'eip155:1/erc20:0xdef'),
        ],
        isLoading: false,
      });
      const { queryByTestId, getByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      expect(queryByTestId('token-row-NIOon')).toBeNull();
      expect(getByTestId('token-row-AAPL')).toBeDefined();
    });
  });

  describe('open_position mode — source token preselection', () => {
    const USDY_ADDRESS = '0x96f6ef951840721adbf46ac996b59e0235cb985c';
    const ACCOUNT_ADDRESS = '0xaccount1';

    beforeEach(() => {
      mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
    });

    it('prefers USDY as the source token when user holds a non-zero USDY balance', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL', 'eip155:1/erc20:0xaapl')],
        isLoading: false,
      });
      mockActiveGroupAccounts = [{ address: ACCOUNT_ADDRESS }];
      mockAllTokenBalances = {
        [ACCOUNT_ADDRESS]: { '0x1': { [USDY_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeDefined();
      expect(srcArg?.symbol).toBe('USDY');
      expect(destArg?.symbol).toBe('AAPL');
    });

    it('falls back to USDC on mainnet as the source token for mainnet assets', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL', 'eip155:1/erc20:0xaapl')],
        isLoading: false,
      });

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg?.symbol).toBe('USDC');
      expect(srcArg?.chainId).toBe('0x1');
      expect(destArg?.symbol).toBe('AAPL');
    });

    it('passes USDT on BNB Chain as the source token for BNB Chain assets', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL', 'eip155:56/erc20:0xaapl')],
        isLoading: false,
      });

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg?.symbol).toBe('USDT');
      expect(srcArg?.chainId).toBe('0x38');
      expect(destArg?.chainId).toBe('eip155:56');
    });

    it('does not preset an open-position source in swap mode', () => {
      mockRouteParams = {
        mode: 'swap',
        campaignId: 'campaign-1',
        srcTokenAsset: 'eip155:1/erc20:0xabc',
        srcTokenSymbol: 'USDC',
        srcTokenDecimals: 6,
      };
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL')],
        isLoading: false,
      });

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });
  });

  describe('Ondo token name display', () => {
    it('preserves backend-provided suffix names in list rows', () => {
      const token = {
        ...buildToken('AAPL'),
        name: 'Apple (Ondo Tokenized)',
      };
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByText, queryByText } = render(
        <OndoCampaignRwaSelectorView />,
      );
      expect(getByText('Apple (Ondo Tokenized)')).toBeDefined();
      expect(queryByText('Apple')).toBeNull();
    });

    it('passes the backend-provided name to goToSwaps', () => {
      const token = {
        ...buildToken('AAPL'),
        name: 'Apple (Ondo Tokenized)',
      };
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));
      expect(mockGoToSwaps).toHaveBeenCalledWith(
        expect.objectContaining({ symbol: 'USDC' }),
        expect.objectContaining({ name: 'Apple (Ondo Tokenized)' }),
      );
    });
  });

  describe('page view tracking', () => {
    it('tracks ondo_campaign_open_position when mode is open_position', () => {
      mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
      render(<OndoCampaignRwaSelectorView />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({ page_type: 'ondo_campaign_open_position' }),
      );
    });

    it('tracks ondo_campaign_swap when mode is swap', () => {
      mockRouteParams = { mode: 'swap', campaignId: 'campaign-1' };
      render(<OndoCampaignRwaSelectorView />);

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      const builder = mockCreateEventBuilder.mock.results[0].value;
      expect(builder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({ page_type: 'ondo_campaign_swap' }),
      );
    });
  });

  describe('analytics — button clicked', () => {
    it('tracks button_clicked with token symbol when token is selected', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      // createEventBuilder is called twice: once for page view, once for button click
      const clickBuilder = mockCreateEventBuilder.mock.results[1].value;
      expect(clickBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_type: 'ondo_campaign_swap_aapl',
        }),
      );
    });
  });

  describe('after hours sheet', () => {
    beforeEach(() => {
      mockIsTokenTradingOpen = jest.fn(() => false);
    });

    it('shows after hours sheet when token trading is closed', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));
      expect(getByTestId('after-hours-sheet')).toBeDefined();
    });

    it('does not navigate to swaps when after hours sheet is shown', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));
      expect(mockGoToSwaps).not.toHaveBeenCalled();
    });

    it('closes sheet and does not navigate when close button is pressed', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      fireEvent.press(getByTestId('token-row-AAPL'));
      fireEvent.press(getByTestId('after-hours-close'));
      expect(queryByTestId('after-hours-sheet')).toBeNull();
      expect(mockGoToSwaps).not.toHaveBeenCalled();
    });

    it('navigates to swaps and closes sheet when confirm is pressed', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      fireEvent.press(getByTestId('token-row-AAPL'));
      fireEvent.press(getByTestId('after-hours-confirm'));
      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      expect(queryByTestId('after-hours-sheet')).toBeNull();
    });

    it('uses USDT as the source token for BNB Chain assets when after hours confirm is pressed', () => {
      const token = buildToken('AAPL', 'eip155:56/erc20:0xaapl');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));
      fireEvent.press(getByTestId('after-hours-confirm'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg?.symbol).toBe('USDT');
      expect(srcArg?.chainId).toBe('0x38');
      expect(destArg?.chainId).toBe('eip155:56');
    });

    it('tracks button_clicked event when after hours confirm is pressed', () => {
      const token = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));
      fireEvent.press(getByTestId('after-hours-confirm'));

      // createEventBuilder: [0] = page view, [1] = button click on confirm
      const confirmBuilder = mockCreateEventBuilder.mock.results[1].value;
      expect(confirmBuilder.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_type: 'ondo_campaign_swap_aapl',
        }),
      );
    });
  });

  describe('search', () => {
    it('hides filter bar when search is visible', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      expect(getByTestId('filter-bar')).toBeDefined();
      fireEvent.press(getByTestId('ondo-rwa-selector-header-search-toggle'));
      expect(queryByTestId('filter-bar')).toBeNull();
    });

    it('shows filter bar again when search is dismissed', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('ondo-rwa-selector-header-search-toggle'));
      fireEvent.press(getByTestId('ondo-rwa-selector-header-search-close'));
      expect(getByTestId('filter-bar')).toBeDefined();
    });
  });
});

describe('getOndoOpenPositionSourceToken', () => {
  it('returns USDT for BNB Chain when the chain ID is hex', () => {
    expect(getOndoOpenPositionSourceToken('0x38')).toEqual(
      expect.objectContaining({
        symbol: 'USDT',
        chainId: '0x38',
      }),
    );
  });

  it('returns undefined when no chain ID is provided', () => {
    expect(getOndoOpenPositionSourceToken(undefined)).toBeUndefined();
  });

  it('returns undefined for unsupported non-EVM chain IDs', () => {
    expect(
      getOndoOpenPositionSourceToken('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'),
    ).toBeUndefined();
  });
});
