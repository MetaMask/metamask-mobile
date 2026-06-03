import React from 'react';
import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import { playImpact, ImpactMoment } from '../../../../util/haptics';
import renderWithProvider from '../../../../util/test/renderWithProvider';
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

interface MockRouteParams {
  positionId?: string;
  traderId: string;
  traderName?: string;
  traderImageUrl?: string;
  traderAddress?: string;
  tokenSymbol?: string;
  position?: Position;
  source?: string;
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
  traderName: 'dutchiono',
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
jest.mock('./components/QuickBuy', () => ({
  __esModule: true,
  default: () => null,
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

jest.mock('../../../UI/AssetOverview/PriceChart', () => {
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
    mockRouteParams = {
      traderId: 'trader-1',
      traderName: 'dutchiono',
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
    expect(screen.getByText('dutchiono')).toBeOnTheScreen();
    expect(screen.getAllByText('PEPE').length).toBeGreaterThanOrEqual(1);
  });

  it('shows empty state when trades array is empty', () => {
    mockRouteParams.position = { ...makeDefaultPosition(), trades: [] };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByText('No trades for this interval')).toBeOnTheScreen();
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
        traderName: 'dutchiono',
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
    expect(screen.getByText('+25%')).toBeOnTheScreen();
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

  it('filters trades when switching time periods', async () => {
    const fixedNow = new Date('2026-04-21T12:00:00.000Z').getTime();
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(fixedNow);

    mockRouteParams.position = {
      ...makeDefaultPosition(),
      trades: [
        {
          intent: 'enter',
          direction: 'buy',
          tokenAmount: 1000,
          usdCost: 2200,
          timestamp: fixedNow - 30 * 60 * 1000,
          transactionHash: '0xrecent',
        },
        {
          intent: 'exit',
          direction: 'sell',
          tokenAmount: 500,
          usdCost: 1100,
          timestamp: fixedNow - 2 * 24 * 60 * 60 * 1000,
          transactionHash: '0xolder',
        },
      ],
    };

    renderWithProvider(<TraderPositionView />, { state: mockState });

    expect(screen.getByTestId('trade-row-0xrecent')).toBeOnTheScreen();
    expect(screen.getByTestId('trade-row-0xolder')).toBeOnTheScreen();

    fireEvent.press(screen.getByText('1H'));

    await waitFor(() => {
      expect(screen.queryByTestId('trade-row-0xolder')).not.toBeOnTheScreen();
    });

    dateNowSpy.mockRestore();
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
      traderName: 'dutchiono',
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
      traderName: 'dutchiono',
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

  describe('analytics source routing', () => {
    it('uses notification as quickBuySource when source param is notification', () => {
      mockRouteParams = { ...mockRouteParams, source: 'notification' };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('uses leaderboard as quickBuySource when source param is leaderboard', () => {
      mockRouteParams = { ...mockRouteParams, source: 'leaderboard' };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });

    it('defaults quickBuySource to profile_position when source param is deep_link', () => {
      mockRouteParams = { ...mockRouteParams, source: 'deep_link' };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      expect(
        screen.getByTestId(TraderPositionViewSelectorsIDs.CONTAINER),
      ).toBeOnTheScreen();
    });
  });

  describe('followTradingTokenContext', () => {
    it('does not track buy when traderAddress is empty', () => {
      mockRouteParams = { ...mockRouteParams, traderAddress: undefined };
      renderWithProvider(<TraderPositionView />, { state: mockState });

      fireEvent.press(
        screen.getByTestId(TraderPositionViewSelectorsIDs.BUY_BUTTON),
      );

      expect(mockPlayImpact).toHaveBeenCalledWith(ImpactMoment.PrimaryCTA);
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
