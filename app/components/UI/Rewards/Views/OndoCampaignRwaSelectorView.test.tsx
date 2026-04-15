import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoCampaignRwaSelectorView from './OndoCampaignRwaSelectorView';
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
  useNavigation: () => ({ goBack: mockGoBack }),
  useRoute: () => ({ params: mockRouteParams }),
}));

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

jest.mock('../utils/formatUtils', () => ({
  ...jest.requireActual('../utils/formatUtils'),
  parseCaip19: jest.fn(() => ({
    namespace: 'eip155',
    chainId: '1',
    assetReference: '0xabc',
  })),
  caipChainIdToHex: jest.fn(() => '0x1'),
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
        ),
    };
  },
);

jest.mock(
  '../../Trending/components/TrendingTokensBottomSheet/TrendingTokenTimeBottomSheet',
  () => ({
    TimeOption: { TwentyFourHours: '24H', OneWeek: '1W', OneMonth: '1M' },
  }),
);

// Silence utility mocks
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

const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn(() => createMockEventBuilder());

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
}));

const buildToken = (symbol: string, assetId?: string): TrendingAsset =>
  ({
    symbol,
    name: `${symbol} Token`,
    decimals: 18,
    assetId: assetId ?? `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    rwaData: null,
  }) as unknown as TrendingAsset;

// Default mock values: no active group accounts, no balances
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

  describe('chain filter toggle', () => {
    it('shows chain filter buttons in open_position mode', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      expect(getByTestId('chain-filter-eip155:1')).toBeDefined();
      expect(getByTestId('chain-filter-eip155:56')).toBeDefined();
    });

    it('calls useRwaTokens with Ethereum chainId by default', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      render(<OndoCampaignRwaSelectorView />);
      const lastCall =
        mockUseRwaTokens.mock.calls[mockUseRwaTokens.mock.calls.length - 1][0];
      expect(lastCall.chainIds).toEqual(['eip155:1']);
    });

    it('switches to BNB Chain when the BNB filter is pressed', () => {
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('chain-filter-eip155:56'));
      const lastCall =
        mockUseRwaTokens.mock.calls[mockUseRwaTokens.mock.calls.length - 1][0];
      expect(lastCall.chainIds).toEqual(['eip155:56']);
    });

    it('does not show chain filter in swap mode', () => {
      mockRouteParams = {
        mode: 'swap',
        campaignId: 'campaign-1',
        srcTokenAsset: 'eip155:1/erc20:0xabc',
        srcTokenSymbol: 'USDC',
        srcTokenDecimals: 6,
      };
      mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
      const { queryByTestId } = render(<OndoCampaignRwaSelectorView />);
      expect(queryByTestId('chain-filter-eip155:1')).toBeNull();
      expect(queryByTestId('chain-filter-eip155:56')).toBeNull();
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
      // Even when the list symbol differs in casing (e.g. after uppercase normalisation),
      // the source token must be filtered out using assetId, not symbol.
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
          buildToken('NIOon', srcAssetId), // same assetId as source — must be excluded
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

  describe('after-hours sheet', () => {
    const token = buildToken('AAPL');

    beforeEach(() => {
      mockIsTokenTradingOpen = jest.fn(() => false);
      mockUseRwaTokens.mockReturnValue({ data: [token], isLoading: false });
    });

    it('shows the after-hours sheet when token trading is closed', () => {
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);

      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(getByTestId('after-hours-sheet')).toBeOnTheScreen();
    });

    it('closes the after-hours sheet without navigating when onClose is called', () => {
      const { getByTestId, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );

      fireEvent.press(getByTestId('token-row-AAPL'));
      expect(getByTestId('after-hours-sheet')).toBeOnTheScreen();

      fireEvent.press(getByTestId('after-hours-close'));

      expect(queryByTestId('after-hours-sheet')).not.toBeOnTheScreen();
      expect(mockGoToSwaps).not.toHaveBeenCalled();
    });

    it('tracks REWARDS_PAGE_BUTTON_CLICKED and calls goToSwaps when onConfirm is called', () => {
      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);

      fireEvent.press(getByTestId('token-row-AAPL'));

      act(() => {
        fireEvent.press(getByTestId('after-hours-confirm'));
      });

      expect(mockCreateEventBuilder).toHaveBeenCalledWith(
        MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const buttonClickIndex = mockCreateEventBuilder.mock.calls.findIndex(
        (call: unknown[]) =>
          call[0] === MetaMetricsEvents.REWARDS_PAGE_BUTTON_CLICKED,
      );
      const builder =
        mockCreateEventBuilder.mock.results[buttonClickIndex]?.value;
      expect(builder?.addProperties).toHaveBeenCalledWith(
        expect.objectContaining({
          button_type: 'ondo_campaign_swap_aapl',
        }),
      );
      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
    });
  });

  describe('search interactions', () => {
    it('shows the clear button when search query is not empty and clears it on press', () => {
      const { getByPlaceholderText, getByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      const input = getByPlaceholderText(
        'rewards.ondo_rwa_asset_selector.search_placeholder',
      );
      fireEvent.changeText(input, 'AAPL');
      expect(getByTestId('clear-search-button')).toBeDefined();
      fireEvent.press(getByTestId('clear-search-button'));
      // After pressing clear, the button should disappear
      expect(() => getByTestId('clear-search-button')).toThrow();
    });

    it('displays skeleton after search query changes (isFiltering)', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL'), buildToken('MSFT')],
        isLoading: false,
      });
      const { getByPlaceholderText, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      const input = getByPlaceholderText(
        'rewards.ondo_rwa_asset_selector.search_placeholder',
      );
      // After changing text, isFiltering becomes true → skeleton shown
      fireEvent.changeText(input, 'AAPL');
      // Skeleton replaces the token list
      expect(queryByTestId('token-row-MSFT')).toBeNull();
    });
  });

  describe('open_position mode — USDY source preselection', () => {
    // parseCaip19 mock always returns assetReference '0xabc', so the balance
    // lookup key matches that address regardless of the USDY_CAIP19 constant.
    const USDY_HEX_ADDRESS = '0xabc';
    const ACCOUNT_ADDRESS = '0xaccount1';

    beforeEach(() => {
      mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
    });

    it('passes USDY as source token when user holds a non-zero USDY balance', () => {
      // rwaTokens intentionally does NOT contain USDY — preset comes from the
      // hardcoded constant, not from the token list.
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL')],
        isLoading: false,
      });
      mockActiveGroupAccounts = [{ address: ACCOUNT_ADDRESS }];
      mockAllTokenBalances = {
        [ACCOUNT_ADDRESS]: { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeDefined();
      expect(srcArg?.symbol).toBe('USDY');
      expect(destArg?.symbol).toBe('AAPL');
    });

    it('preset survives search — applies even when rwaTokens is filtered to non-USDY results', () => {
      // Simulate the user having searched for "AAPL": rwaTokens contains only AAPL.
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL')],
        isLoading: false,
      });
      mockActiveGroupAccounts = [{ address: ACCOUNT_ADDRESS }];
      mockAllTokenBalances = {
        [ACCOUNT_ADDRESS]: { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg?.symbol).toBe('USDY');
    });

    it('passes undefined as source token when active group accounts are empty', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL')],
        isLoading: false,
      });
      mockActiveGroupAccounts = [];

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });

    it('passes undefined as source token when USDY balance is zero', () => {
      mockUseRwaTokens.mockReturnValue({
        data: [buildToken('AAPL')],
        isLoading: false,
      });
      mockActiveGroupAccounts = [{ address: ACCOUNT_ADDRESS }];
      mockAllTokenBalances = {
        [ACCOUNT_ADDRESS]: { '0x1': { [USDY_HEX_ADDRESS]: '0x0' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });

    it('does not preset USDY as source in swap mode even when user holds balance', () => {
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
      mockActiveGroupAccounts = [{ address: ACCOUNT_ADDRESS }];
      mockAllTokenBalances = {
        [ACCOUNT_ADDRESS]: { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
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
});
