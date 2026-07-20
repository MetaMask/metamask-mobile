import React from 'react';
import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from '@testing-library/react-native';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';
import { MetaMetricsEvents } from '../../../../core/Analytics';
import TraderPositionView from './TraderPositionView';
import { TraderPositionViewSelectorsIDs } from './TraderPositionView.testIds';
import type { Position, Trade } from '@metamask/social-controllers';
import { handleFetch } from '@metamask/controller-utils';
import ClipboardManager from '../../../../core/ClipboardManager';
import Routes from '../../../../constants/navigation/Routes';

const mockGoBack = jest.fn();
const mockNavigate = jest.fn();
const mockGetAssetImageUrl = jest.fn();
const mockHandleFetch = handleFetch as jest.MockedFunction<typeof handleFetch>;
const mockPriceChart = jest.fn();
const mockTraderPriceChart = jest.fn();
const mockRefetchPosition = jest.fn().mockResolvedValue(undefined);
const mockRefreshProfile = jest.fn().mockResolvedValue(undefined);
const mockSelectSocialLeaderboardPerpsEnabled = jest.fn(() => true);

interface MockRouteParams {
  positionId?: string;
  traderId: string;
  traderName?: string;
  traderImageUrl?: string;
  traderAddress?: string;
  tokenSymbol?: string;
  position?: Position;
  source?: string;
  originalEntryPoint?: string;
}

const makeMockTrades = (): Trade[] => [
  {
    intent: 'enter',
    direction: 'buy',
    tokenAmount: 1000,
    usdCost: 2200,
    timestamp: Date.now() - 30 * 60 * 1000, // 30 minutes ago
    transactionHash: '0xabc',
  },
  {
    intent: 'exit',
    direction: 'sell',
    tokenAmount: 500,
    usdCost: 1100,
    timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
    transactionHash: '0xdef',
  },
];

const makeDefaultPosition = (): Position => ({
  positionId: 'pepe-base',
  tokenSymbol: 'PEPE',
  tokenName: 'Pepe',
  tokenAddress: '0x1234567890123456789012345678901234567890',
  chain: 'base',
  positionAmount: 1000,
  boughtUsd: 500,
  soldUsd: 0,
  realizedPnl: 0,
  costBasis: 500,
  trades: makeMockTrades(),
  lastTradeAt: Date.now(),
  currentValueUSD: 900,
  pnlValueUsd: 400,
  pnlPercent: 80,
});

let mockRouteParams: MockRouteParams = {
  traderId: 'trader-1',
  traderName: 'trader1',
  traderAddress: '0xabc',
  tokenSymbol: 'PEPE',
  position: makeDefaultPosition(),
};

const mockState = {
  engine: {
    backgroundState: {
      TokenRatesController: {
        marketData: {},
      },
      CurrencyRateController: {
        currentCurrency: 'usd',
      },
    },
  },
};

jest.mock('@metamask/controller-utils', () => ({
  ...jest.requireActual('@metamask/controller-utils'),
  handleFetch: jest.fn().mockResolvedValue({}),
}));

jest.mock('../../../../core/ClipboardManager', () => ({
  setString: jest.fn().mockResolvedValue(undefined),
}));

// Pressing buy mounts TraderPositionQuickBuy (`QuickBuy.Root`). Jest's global mock
// for design-system `BottomSheet` (see app/util/test/testSetup.js) can mount
// QuickBuy provider/controller (bridge selectors, NetworkController, …). This
// file intentionally uses a minimal Redux store, so we stub the sheet here.
const mockTraderPositionQuickBuy = jest.fn((_props: unknown) => null);
jest.mock('./components/QuickBuy', () => ({
  __esModule: true,
  default: (props: unknown) => mockTraderPositionQuickBuy(props),
}));

// Resolves the tradable perp market set used by the Trade CTA's xyz/HIP-3
// gating. Mocked because the real hook reaches into the Perps stream provider,
// which this minimal-store test does not mount.
const mockUseTradablePerpsMarketSymbols = jest.fn();
jest.mock('../../../UI/WhatsHappening/hooks', () => ({
  useTradablePerpsMarketSymbols: () => mockUseTradablePerpsMarketSymbols(),
}));

// PerpsTradeButton wraps itself in PerpsStreamProvider; stub it to a passthrough
// so the real stream-manager singleton isn't pulled into this minimal-store test.
jest.mock('../../../UI/Perps/providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock('../../../../util/haptics', () => {
  const actual = jest.requireActual<typeof import('../../../../util/haptics')>(
    '../../../../util/haptics',
  );
  return {
    ...actual,
    playImpact: jest.fn(),
  };
});

const mockPlayImpact = jest.mocked(playImpact);
const mockTrack = jest.fn();

jest.mock('../analytics', () => {
  const actual = jest.requireActual('../analytics');
  return {
    ...actual,
    useSocialLeaderboardAnalytics: () => ({ track: mockTrack }),
  };
});

// New hooks added for deep-link self-sufficiency. Existing tests pass `position`
// via route params, so these are effectively no-ops in the existing flow.
jest.mock('./hooks/useTraderPosition', () => ({
  useTraderPosition: jest.fn(() => ({
    position: undefined,
    isLoading: false,
    error: null,
    refetch: mockRefetchPosition,
  })),
}));

jest.mock('../TraderProfileView/hooks/useTraderProfile', () => ({
  useTraderProfile: jest.fn(() => ({
    profile: null,
    isLoading: false,
    error: null,
    isFollowing: false,
    toggleFollow: jest.fn(),
    refresh: mockRefreshProfile,
  })),
}));

jest.mock('../../../hooks/useAnalytics/useAnalytics', () => {
  const { createMockUseAnalyticsHook } = jest.requireActual(
    '../../../../util/test/analyticsMock',
  );
  return { useAnalytics: () => createMockUseAnalyticsHook() };
});

jest.mock('../../../UI/AssetOverview/PriceChart/PriceChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockPriceChart(props);
      return <View testID="price-chart-mock" />;
    },
  };
});
jest.mock('./components/TraderPriceChart', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: (props: unknown) => {
      mockTraderPriceChart(props);
      return <View testID="trader-price-chart-mock" />;
    },
  };
});
jest.mock('../../../UI/AssetOverview/PriceChart/PriceChart.context', () => {
  const ReactActual = jest.requireActual('react');
  return {
    PriceChartProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// Mock fetch for historical prices API
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ prices: [] }),
}) as jest.Mock;

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock(
  '../../../../selectors/featureFlagController/socialLeaderboard',
  () => ({
    selectSocialLeaderboardPerpsEnabled: () =>
      mockSelectSocialLeaderboardPerpsEnabled(),
  }),
);

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');

  return {
    ...actual,
    useNavigation: () => ({
      goBack: mockGoBack,
      navigate: mockNavigate,
    }),
    useRoute: () => ({
      params: mockRouteParams,
    }),
  };
});

jest.mock('../components/PositionTokenAvatar', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('../../../UI/Bridge/hooks/useAssetMetadata/utils', () => ({
  getAssetImageUrl: (...args: unknown[]) => mockGetAssetImageUrl(...args),
  toAssetId: (address: string, chainId: string) =>
    `${chainId}/erc20:${address}`,
}));

describe('TraderPositionView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetchPosition.mockResolvedValue(undefined);
    mockRefreshProfile.mockResolvedValue(undefined);
    mockHandleFetch.mockResolvedValue({});
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ prices: [] }),
    }) as jest.Mock;
    mockGetAssetImageUrl.mockReturnValue('https://example.com/token.png');
    mockUseTradablePerpsMarketSymbols.mockReturnValue({
      tradableSymbols: new Set<string>(),
      isLoading: false,
    });
    mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(true);
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'trader1',
      traderAddress: '0xabc',
      tokenSymbol: 'PEPE',
      position: makeDefaultPosition(),
    };
  });

  it('renders the container with real position data', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.TRADER_NAME_LINK),
    ).toBeOnTheScreen();
    expect(
      within(
        screen.getByTestId(TraderPositionViewSelectorsIDs.TRADER_NAME_LINK),
      ).getByText('trader1'),
    ).toBeOnTheScreen();
    expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
  });

  it('does not render the floating sticky day header at rest', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    // At rest the natural in-list day headers carry the labels; the floating
    // sticky only appears once trades scroll behind the pinned chart's edge.
    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.STICKY_DAY_HEADER),
    ).toBeNull();
  });

  it('shows empty state when trades array is empty', () => {
    mockRouteParams.position = { ...makeDefaultPosition(), trades: [] };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByText('No trades yet')).toBeOnTheScreen();
  });

  it('calls goBack when the back button is pressed', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BACK_BUTTON),
    );

    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('navigates to the trader profile when the trader name is pressed', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.TRADER_NAME_LINK),
    );

    expect(mockNavigate).toHaveBeenCalledWith(
      Routes.SOCIAL_LEADERBOARD.PROFILE,
      {
        traderId: 'trader-1',
        traderName: 'trader1',
      },
    );
    expect(mockGoBack).not.toHaveBeenCalled();
  });

  it('renders the fallback when position is undefined and no positionId is provided', () => {
    mockRouteParams.position = undefined;
    mockRouteParams.tokenSymbol = 'DOGE';

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
    ).toBeOnTheScreen();
    // Price chart should not be rendered in the fallback state
    expect(screen.queryByTestId('trader-price-chart-mock')).toBeNull();
  });

  it('renders the skeleton while a positionId fetch is in flight', () => {
    const { useTraderPosition } = jest.requireMock('./hooks/useTraderPosition');
    (useTraderPosition as jest.Mock).mockReturnValue({
      position: undefined,
      isLoading: true,
      error: null,
      refetch: mockRefetchPosition,
    });

    mockRouteParams.position = undefined;
    (mockRouteParams as { positionId?: string }).positionId = 'position-uuid-1';

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.SKELETON),
    ).toBeOnTheScreen();

    (useTraderPosition as jest.Mock).mockReturnValue({
      position: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetchPosition,
    });
  });

  it('renders content when position is fetched via positionId', () => {
    const { useTraderPosition } = jest.requireMock('./hooks/useTraderPosition');
    (useTraderPosition as jest.Mock).mockReturnValue({
      position: makeDefaultPosition(),
      isLoading: false,
      error: null,
      refetch: mockRefetchPosition,
    });

    mockRouteParams.position = undefined;
    (mockRouteParams as { positionId?: string }).positionId = 'position-uuid-1';

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
    ).toBeOnTheScreen();
    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.SKELETON),
    ).toBeNull();
    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
    ).toBeNull();

    (useTraderPosition as jest.Mock).mockReturnValue({
      position: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetchPosition,
    });
  });

  it('does not leave price chart in loading state when chain is unsupported', async () => {
    mockRouteParams.position = {
      ...makeDefaultPosition(),
      chain: 'unsupported-chain',
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    await waitFor(() => {
      const lastCall =
        mockTraderPriceChart.mock.calls[
          mockTraderPriceChart.mock.calls.length - 1
        ]?.[0];
      expect(lastCall).toMatchObject({ isLoading: false });
    });
  });

  it('renders the buy button', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
    ).toBeOnTheScreen();
  });

  it('fires Follow Trading Token CTA Clicked with cta_type buy when the Buy button is pressed', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
    );

    expect(mockTrack).toHaveBeenCalledWith(
      MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
      expect.objectContaining({
        trader_address: '0xabc',
        asset_name: 'PEPE',
        chain_name: 'base',
        caip19: expect.stringContaining('eip155:8453/erc20:'),
        cta_type: 'buy',
      }),
    );
  });

  describe('perp positions', () => {
    beforeEach(() => {
      mockRouteParams.position = {
        ...makeDefaultPosition(),
        tokenSymbol: 'ETH',
        chain: 'hyperliquid',
        perpPositionType: 'short',
        perpLeverage: 10,
      };
    });

    it('renders the Trade button instead of the Buy button', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      ).not.toBeOnTheScreen();
    });

    it('navigates to the Perps market page (not QuickBuy) when the Trade button is pressed', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      );

      // Perps has no long/short preselect on the market page, so the single
      // Trade CTA lands the user on that market's Perps page with a minimal
      // market object — it never opens the spot QuickBuy sheet.
      expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
        screen: Routes.PERPS.MARKET_DETAILS,
        params: {
          market: { symbol: 'ETH', name: 'ETH' },
          source: 'social_leaderboard',
        },
      });
    });

    it('fires Follow Trading Token Screen Viewed with perps_market on mount', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_SCREEN_VIEWED,
        expect.objectContaining({
          trader_address: '0xabc',
          asset_name: 'ETH',
          chain_name: 'hyperliquid',
          perps_market: 'ETH',
          source: 'trader_profile',
        }),
      );
    });

    it('fires Follow Trading Token CTA Clicked with cta_type trade when the Trade button is pressed', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      );

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
        expect.objectContaining({
          trader_address: '0xabc',
          asset_name: 'ETH',
          chain_name: 'hyperliquid',
          perps_market: 'ETH',
          cta_type: 'trade',
        }),
      );
    });

    it('fires Follow Trading Token Dismissed with perps_market when backing out without trading', () => {
      const { unmount } = renderWithProvider(<TraderPositionView />, {
        state: mockState,
      });

      unmount();

      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_DISMISSED,
        {
          trader_address: '0xabc',
          chain_name: 'hyperliquid',
          perps_market: 'ETH',
        },
      );
    });

    it('does not fire Follow Trading Token Dismissed after Trade is pressed', () => {
      const { unmount } = renderWithProvider(<TraderPositionView />, {
        state: mockState,
      });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      );
      mockTrack.mockClear();
      unmount();

      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_DISMISSED,
        expect.anything(),
      );
    });

    it('renders the perp leverage and direction badges in the header', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      const headerPerpBadges = within(
        screen.getByTestId(
          TraderPositionViewSelectorsIDs.HEADER_COMPACT_PERP_BADGES,
        ),
      );

      expect(headerPerpBadges.getByText('10x')).toBeOnTheScreen();
      expect(headerPerpBadges.getByText('SHORT')).toBeOnTheScreen();
    });

    it('does not render the copy token address button for a perp position', () => {
      renderWithProvider(<TraderPositionView />, { state: mockState });

      // Perps have no on-chain token address, so copy is not offered.
      expect(
        screen.queryByTestId(
          TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON,
        ),
      ).not.toBeOnTheScreen();
    });

    it('renders the fallback instead of perp details when social leaderboard perps are disabled', () => {
      mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(false);

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText('SHORT')).not.toBeOnTheScreen();
    });

    it('renders the fallback when a disabled perp position resolves from positionId', () => {
      const { useTraderPosition } = jest.requireMock(
        './hooks/useTraderPosition',
      );
      (useTraderPosition as jest.Mock).mockReturnValue({
        position: mockRouteParams.position,
        isLoading: false,
        error: null,
        refetch: mockRefetchPosition,
      });
      mockSelectSocialLeaderboardPerpsEnabled.mockReturnValue(false);
      mockRouteParams.position = undefined;
      mockRouteParams.positionId = 'position-uuid-1';

      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.FALLBACK),
      ).toBeOnTheScreen();
      expect(
        screen.queryByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
      ).not.toBeOnTheScreen();

      (useTraderPosition as jest.Mock).mockReturnValue({
        position: undefined,
        isLoading: false,
        error: null,
        refetch: mockRefetchPosition,
      });
    });

    describe('HIP-3 markets', () => {
      it('hides the provider prefix in the displayed symbol', () => {
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'cash:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        expect(screen.getAllByText('SPCX').length).toBeGreaterThanOrEqual(1);
        expect(screen.queryByText('cash:SPCX')).toBeNull();
      });

      it('links an xyz market directly without a tradable-set check', () => {
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'xyz:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        fireEvent.press(
          screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
        );

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: { symbol: 'xyz:SPCX', name: 'SPCX' },
            source: 'social_leaderboard',
          },
        });
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
          expect.objectContaining({
            perps_market: 'xyz:SPCX',
            cta_type: 'trade',
          }),
        );
      });

      it('links another HIP-3 provider to its xyz equivalent when that market exists', () => {
        mockUseTradablePerpsMarketSymbols.mockReturnValue({
          tradableSymbols: new Set(['xyz:SPCX']),
          isLoading: false,
        });
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'cash:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        fireEvent.press(
          screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
        );

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: { symbol: 'xyz:SPCX', name: 'SPCX' },
            source: 'social_leaderboard',
          },
        });
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
          expect.objectContaining({
            perps_market: 'xyz:SPCX',
            cta_type: 'trade',
          }),
        );
      });

      it('disables the Trade button as Unsupported market when the loaded market list lacks the xyz market', () => {
        // A populated set that does not include the target is a definitive
        // "no such market" — only then do we disable.
        mockUseTradablePerpsMarketSymbols.mockReturnValue({
          tradableSymbols: new Set(['BTC', 'ETH', 'xyz:OTHER']),
          isLoading: false,
        });
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'cash:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        expect(screen.getByText('Unsupported market')).toBeOnTheScreen();

        fireEvent.press(
          screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
        );

        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockPlayImpact).not.toHaveBeenCalled();
      });

      it('stays enabled (optimistic) while the market list is still loading', () => {
        mockUseTradablePerpsMarketSymbols.mockReturnValue({
          tradableSymbols: new Set<string>(),
          isLoading: true,
        });
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'cash:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        expect(screen.queryByText('Unsupported market')).toBeNull();
        fireEvent.press(
          screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
        );

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: { symbol: 'xyz:SPCX', name: 'SPCX' },
            source: 'social_leaderboard',
          },
        });
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
          expect.objectContaining({
            perps_market: 'xyz:SPCX',
            cta_type: 'trade',
          }),
        );
      });

      it('stays optimistic when the market set is empty even with isLoading false (fetch in flight / empty cache)', () => {
        // usePerpsMarkets can report isLoading:false with an empty list while a
        // fetch is still in flight; an empty set must not lock the button into
        // a false "Unsupported market".
        mockUseTradablePerpsMarketSymbols.mockReturnValue({
          tradableSymbols: new Set<string>(),
          isLoading: false,
        });
        mockRouteParams.position = {
          ...makeDefaultPosition(),
          tokenSymbol: 'cash:SPCX',
          chain: 'hyperliquid',
          perpPositionType: 'long',
        };

        renderWithProvider(<TraderPositionView />, { state: mockState });

        expect(screen.queryByText('Unsupported market')).toBeNull();
        fireEvent.press(
          screen.getByTestId(TraderPositionViewSelectorsIDs.TRADE_BUTTON),
        );

        expect(mockNavigate).toHaveBeenCalledWith(Routes.PERPS.ROOT, {
          screen: Routes.PERPS.MARKET_DETAILS,
          params: {
            market: { symbol: 'xyz:SPCX', name: 'SPCX' },
            source: 'social_leaderboard',
          },
        });
        expect(mockTrack).toHaveBeenCalledWith(
          MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
          expect.objectContaining({
            perps_market: 'xyz:SPCX',
            cta_type: 'trade',
          }),
        );
      });
    });
  });

  it('forwards the filtered trades to the chart component', async () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    await waitFor(() => {
      const lastCall =
        mockTraderPriceChart.mock.calls[
          mockTraderPriceChart.mock.calls.length - 1
        ]?.[0];
      expect(lastCall).toHaveProperty('trades');
      expect(Array.isArray(lastCall.trades)).toBe(true);
    });
  });

  it('fires a medium impact haptic when the buy button is pressed', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
    );

    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
  });

  it('does not fire a haptic when the buy button is pressed without a resolved position', () => {
    mockRouteParams.position = undefined;
    (mockRouteParams as { positionId?: string }).positionId = 'unresolved-id';

    renderWithProvider(<TraderPositionView />, { state: mockState });

    const buyButton = screen.queryByTestId(
      TraderPositionViewSelectorsIDs.BUY_BUTTON,
    );
    if (buyButton) {
      fireEvent.press(buyButton);
    }

    expect(mockPlayImpact).not.toHaveBeenCalled();
  });

  it('builds the token image URL when the position chain is supported', () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(mockGetAssetImageUrl).toHaveBeenCalledWith(
      '0x1234567890123456789012345678901234567890',
      'eip155:8453',
    );
  });

  it('copies the token address when the token address button is pressed', async () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(
      screen.getByTestId(
        TraderPositionViewSelectorsIDs.COPY_TOKEN_ADDRESS_BUTTON,
      ),
    );

    await waitFor(() => {
      expect(ClipboardManager.setString).toHaveBeenCalledWith(
        '0x1234567890123456789012345678901234567890',
      );
    });
  });

  it('skips token image URL resolution when the position chain is unsupported', () => {
    mockRouteParams.position = {
      ...makeDefaultPosition(),
      chain: 'unsupported-chain',
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(mockGetAssetImageUrl).not.toHaveBeenCalled();
  });

  it('displays market cap from TokenRatesController when available', () => {
    const stateWithMarket = {
      engine: {
        backgroundState: {
          TokenRatesController: {
            marketData: {
              '0x2105': {
                '0x1234567890123456789012345678901234567890': {
                  marketCap: 11700000,
                  pricePercentChange1d: 7.2,
                },
              },
            },
          },
          CurrencyRateController: {
            currentCurrency: 'usd',
          },
        },
      },
    };

    renderWithProvider(<TraderPositionView />, { state: stateWithMarket });

    expect(screen.getByText('$11.7M')).toBeOnTheScreen();
  });

  it('renders closed position label with realized pnl data', () => {
    mockRouteParams.position = {
      ...makeDefaultPosition(),
      positionAmount: 0,
      soldUsd: 1500,
      realizedPnl: 300,
      boughtUsd: 1200,
      currentValueUSD: 0,
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByText('Closed position')).toBeOnTheScreen();
    expect(screen.getByText('+$300.00')).toBeOnTheScreen();
    expect(screen.getByText('+25.00%')).toBeOnTheScreen();
  });

  it('displays market cap from the fallback API when cache is empty', async () => {
    mockHandleFetch.mockResolvedValue({
      'eip155:8453/erc20:0x1234567890123456789012345678901234567890': {
        marketCap: 9900000,
      },
    });

    renderWithProvider(<TraderPositionView />, { state: mockState });

    await waitFor(() => {
      expect(screen.getByText('$9.9M')).toBeOnTheScreen();
    });
  });

  it('passes all trades to the chart regardless of the active time period', async () => {
    // Markers are bounded to the chart's loaded data window inside the chart
    // component (not a now-relative period window), so the view forwards the
    // full trade list and never drops past trades — e.g. a closed position whose
    // fills predate the selected period must still surface on the chart.
    const now = Date.now();

    mockRouteParams.position = {
      ...makeDefaultPosition(),
      trades: [
        {
          intent: 'enter',
          direction: 'buy',
          tokenAmount: 1000,
          usdCost: 2200,
          timestamp: now - 30 * 60 * 1000,
          transactionHash: '0xrecent',
        },
        {
          intent: 'exit',
          direction: 'sell',
          tokenAmount: 500,
          usdCost: 1100,
          timestamp: now - 2 * 24 * 60 * 60 * 1000,
          transactionHash: '0xolder',
        },
      ],
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByTestId('trade-row-0xrecent')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-0xolder')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('1H'));

    await waitFor(() => {
      const chartTrades =
        mockTraderPriceChart.mock.calls[
          mockTraderPriceChart.mock.calls.length - 1
        ]?.[0]?.trades;
      expect(chartTrades).toHaveLength(2);
      expect(
        chartTrades.map((t: { transactionHash: string }) => t.transactionHash),
      ).toEqual(expect.arrayContaining(['0xrecent', '0xolder']));
    });
    expect(screen.getByTestId('trade-row-0xrecent')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-0xolder')).toBeOnTheScreen();
  });

  it('refetches position and profile on pull-to-refresh', async () => {
    renderWithProvider(<TraderPositionView />, { state: mockState });

    const refreshControl = screen.UNSAFE_getByProps({
      testID: TraderPositionViewSelectorsIDs.REFRESH_CONTROL,
    });

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRefetchPosition).toHaveBeenCalledTimes(1);
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
  });

  it('refreshes profile on pull even when name and image came via nav params', async () => {
    mockRouteParams = {
      ...mockRouteParams,
      traderName: 'trader1',
      traderImageUrl: 'https://example.com/avatar.png',
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    const refreshControl = screen.UNSAFE_getByProps({
      testID: TraderPositionViewSelectorsIDs.REFRESH_CONTROL,
    });

    await act(async () => {
      await refreshControl.props.onRefresh();
    });

    expect(mockRefetchPosition).toHaveBeenCalledTimes(1);
    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledTimes(1);
    expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PullToRefresh);
  });

  it('does not render the refresh control in the fallback state', () => {
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'trader1',
      tokenSymbol: 'PEPE',
      position: undefined,
    };
    (mockRouteParams as { positionId?: string }).positionId = undefined;

    const { useTraderPosition } = jest.requireMock('./hooks/useTraderPosition');
    (useTraderPosition as jest.Mock).mockReturnValue({
      position: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetchPosition,
    });

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(
      screen.queryByTestId(TraderPositionViewSelectorsIDs.REFRESH_CONTROL),
    ).toBeNull();

    (useTraderPosition as jest.Mock).mockReturnValue({
      position: undefined,
      isLoading: false,
      error: null,
      refetch: mockRefetchPosition,
    });
  });

  describe('Quick Buy analytics routing', () => {
    it('passes profile_position source and notification original_entry_point from route params', () => {
      mockRouteParams = {
        ...mockRouteParams,
        source: 'notification',
        originalEntryPoint: 'notification',
      };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(mockTraderPositionQuickBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'profile_position',
          originalEntryPoint: 'notification',
        }),
      );
    });

    it('passes forwarded original_entry_point from route params', () => {
      mockRouteParams = {
        ...mockRouteParams,
        source: 'profile_position',
        originalEntryPoint: 'leaderboard',
      };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(mockTraderPositionQuickBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'profile_position',
          originalEntryPoint: 'leaderboard',
        }),
      );
    });

    it('derives original_entry_point from position source when route param is absent', () => {
      mockRouteParams = { ...mockRouteParams, source: 'deep_link' };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(mockTraderPositionQuickBuy).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'profile_position',
          originalEntryPoint: 'deep_link',
        }),
      );
    });
  });

  describe('followTradingTokenContext', () => {
    it('does not track cta when traderAddress is empty', () => {
      mockRouteParams = { ...mockRouteParams, traderAddress: undefined };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
      expect(mockTrack).not.toHaveBeenCalledWith(
        MetaMetricsEvents.SOCIAL_FOLLOW_TRADING_TOKEN_CTA_CLICKED,
        expect.anything(),
      );
    });

    it('does not track when chain is unsupported (caip19 empty)', () => {
      mockRouteParams = {
        ...mockRouteParams,
        position: { ...makeDefaultPosition(), chain: 'unsupported-chain' },
      };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  it('uses 1W prices on the All tab when 3y and 1m are empty', async () => {
    const weeklyPrices: [string, number][] = [
      ['1713571200000', 1.23],
      ['1713657600000', 1.56],
    ];

    global.fetch = jest.fn().mockImplementation((input: string) => {
      const url = new URL(input);
      const timePeriod = url.searchParams.get('timePeriod');

      const pricesByPeriod: Record<string, [number, number][]> = {
        '1d': [],
        '7d': weeklyPrices.map(([timestamp, price]) => [
          Number(timestamp),
          price,
        ]),
        '1m': [],
        '3y': [],
      };

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({ prices: pricesByPeriod[timePeriod ?? ''] }),
      });
    }) as jest.Mock;

    renderWithProvider(<TraderPositionView />, { state: mockState });

    fireEvent.press(screen.getByText('All'));

    await waitFor(() => {
      const lastCall =
        mockTraderPriceChart.mock.calls[
          mockTraderPriceChart.mock.calls.length - 1
        ]?.[0];

      expect(lastCall).toMatchObject({
        prices: weeklyPrices,
      });
    });
  });
});
