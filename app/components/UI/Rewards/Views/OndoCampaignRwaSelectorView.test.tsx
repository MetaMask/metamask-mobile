import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { useSelector } from 'react-redux';
import OndoCampaignRwaSelectorView from './OndoCampaignRwaSelectorView';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { selectCurrentSubscriptionAccounts } from '../../../../selectors/rewards';
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

jest.mock('../../../../selectors/rewards', () => ({
  selectCurrentSubscriptionAccounts: jest.fn(),
}));

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

jest.mock('../../Bridge/hooks/useRWAToken', () => ({
  useRWAToken: () => ({
    isStockToken: jest.fn(() => false),
    isTokenTradingOpen: jest.fn(() => true),
  }),
}));

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

jest.mock('@metamask/utils', () => ({
  ...jest.requireActual('@metamask/utils'),
  parseCaipAccountId: jest.fn((caipAccount: string) => ({
    address: caipAccount.split(':').pop() ?? '0xaccount',
  })),
}));

const buildToken = (symbol: string, assetId?: string): TrendingAsset =>
  ({
    symbol,
    name: `${symbol} Token`,
    decimals: 18,
    assetId: assetId ?? `eip155:1/erc20:0x${symbol.toLowerCase()}`,
    rwaData: null,
  }) as unknown as TrendingAsset;

const USDY_ASSET_ID = 'eip155:1/erc20:0xusdy';
const buildUsdyToken = (): TrendingAsset =>
  ({
    symbol: 'USDY',
    name: 'Ondo USD Yield',
    decimals: 18,
    assetId: USDY_ASSET_ID,
    rwaData: null,
  }) as unknown as TrendingAsset;

// Default mock values: no subscription accounts, no balances
let mockSubscriptionAccounts: { account: string }[] = [];
let mockAllTokenBalances: Record<
  string,
  Record<string, Record<string, string>>
> = {};

describe('OndoCampaignRwaSelectorView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRwaTokens.mockReturnValue({ data: [], isLoading: false });
    mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
    mockSubscriptionAccounts = [];
    mockAllTokenBalances = {};
    (useSelector as jest.Mock).mockImplementation((selector) => {
      if (selector === selectCurrentSubscriptionAccounts)
        return mockSubscriptionAccounts;
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
  });

  describe('search interactions', () => {
    it('shows the clear button when search query is not empty and clears it on press', () => {
      const { getByPlaceholderText, getByTestId, queryByTestId } = render(
        <OndoCampaignRwaSelectorView />,
      );
      const input = getByPlaceholderText(
        'rewards.ondo_rwa_asset_selector.search_placeholder',
      );
      fireEvent.changeText(input, 'AAPL');
      expect(getByTestId('clear-search-button')).toBeDefined();
      // Clear button appears as a TouchableOpacity wrapping the close icon
      // Verify the input has the typed value and pressing clear resets it
      fireEvent.changeText(input, '');
      expect(
        getByPlaceholderText(
          'rewards.ondo_rwa_asset_selector.search_placeholder',
        ),
      ).toBeDefined();
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
    const ACCOUNT_CAIP = 'eip155:1:0xaccount1';
    const USDY_HEX_ADDRESS = '0xabc'; // matches parseCaip19 mock → assetReference: '0xabc'

    beforeEach(() => {
      mockRouteParams = { mode: 'open_position', campaignId: 'campaign-1' };
    });

    it('passes USDY as source token when user holds a non-zero USDY balance', () => {
      const usdy = buildUsdyToken();
      const aapl = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({
        data: [usdy, aapl],
        isLoading: false,
      });
      mockSubscriptionAccounts = [{ account: ACCOUNT_CAIP }];
      // allTokenBalances[address][chainHex][tokenHex] = non-zero hex
      mockAllTokenBalances = {
        '0xaccount1': { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg, destArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeDefined();
      expect(srcArg?.symbol).toBe('USDY');
      expect(destArg?.symbol).toBe('AAPL');
    });

    it('passes undefined as source token when subscription accounts are empty', () => {
      const usdy = buildUsdyToken();
      const aapl = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({
        data: [usdy, aapl],
        isLoading: false,
      });
      mockSubscriptionAccounts = [];

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });

    it('passes undefined as source token when USDY balance is zero', () => {
      const usdy = buildUsdyToken();
      const aapl = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({
        data: [usdy, aapl],
        isLoading: false,
      });
      mockSubscriptionAccounts = [{ account: ACCOUNT_CAIP }];
      mockAllTokenBalances = {
        '0xaccount1': { '0x1': { [USDY_HEX_ADDRESS]: '0x0' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });

    it('passes undefined as source token when USDY is not in the token list', () => {
      const aapl = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({
        data: [aapl],
        isLoading: false,
      });
      mockSubscriptionAccounts = [{ account: ACCOUNT_CAIP }];
      mockAllTokenBalances = {
        '0xaccount1': { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
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
      const usdy = buildUsdyToken();
      const aapl = buildToken('AAPL');
      mockUseRwaTokens.mockReturnValue({
        data: [usdy, aapl],
        isLoading: false,
      });
      mockSubscriptionAccounts = [{ account: ACCOUNT_CAIP }];
      mockAllTokenBalances = {
        '0xaccount1': { '0x1': { [USDY_HEX_ADDRESS]: '0x64' } },
      };

      const { getByTestId } = render(<OndoCampaignRwaSelectorView />);
      fireEvent.press(getByTestId('token-row-AAPL'));

      expect(mockGoToSwaps).toHaveBeenCalledTimes(1);
      // In swap mode ondoUsdSrcToken is always undefined
      const [srcArg] = mockGoToSwaps.mock.calls[0];
      expect(srcArg).toBeUndefined();
    });
  });
});
