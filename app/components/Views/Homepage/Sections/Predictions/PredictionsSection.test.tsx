import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react-native';
import renderWithProvider from '../../../../../util/test/renderWithProvider';
import PredictionsSection from './PredictionsSection';
import Routes from '../../../../../constants/navigation/Routes';
import { PREDICT_CLAIM_BUTTON_TEST_IDS } from '../../../../UI/Predict/components/PredictActionButtons/PredictClaimButton.testIds';
import { PredictEventValues } from '../../../../UI/Predict/constants/eventNames';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

const mockNavigate = jest.fn();
const mockClaim = jest.fn();
const mockTrackEvent = jest.fn();
const mockCreateEventBuilder = jest.fn((event: unknown) => ({
  addProperties: (properties: Record<string, unknown>) => ({
    build: () => ({ event, properties }),
  }),
}));

jest.mock('../../../../hooks/useAnalytics/useAnalytics', () => ({
  useAnalytics: () => ({
    trackEvent: mockTrackEvent,
    createEventBuilder: mockCreateEventBuilder,
  }),
}));

const PREDICT_EMPTY_STATE_AB_KEY = 'coreMCU747AbtestPredictPositionsEmptyState';
const predictEmptyStateTreatmentActiveAbTests = [
  {
    key: PREDICT_EMPTY_STATE_AB_KEY,
    value: 'treatment',
    key_value_pair: `${PREDICT_EMPTY_STATE_AB_KEY}=treatment`,
  },
];
const predictEmptyStateControlActiveAbTests = [
  {
    key: PREDICT_EMPTY_STATE_AB_KEY,
    value: 'control',
    key_value_pair: `${PREDICT_EMPTY_STATE_AB_KEY}=control`,
  },
];

const worldCupHomepageMarketsMock = (
  marketData: unknown[],
  opts: { isFetching?: boolean; hasMore?: boolean } = {},
) => ({
  marketData,
  isFetching: opts.isFetching ?? false,
  isFetchingMore: false,
  error: null,
  hasMore: opts.hasMore ?? false,
  refetch: jest.fn(),
  fetchMore: jest.fn(),
});

const HOMEPAGE_DISCOVERY_WINNER_MARKET = {
  id: 'market-1',
  title: '2026 FIFA World Cup Winner',
  endDate: '2026-06-01',
  outcomes: [
    {
      id: 'outcome-1',
      title: 'Yes',
      status: 'open' as const,
      tokens: [{ title: 'Yes', price: 0.55 }],
    },
  ],
};

const HOMEPAGE_DISCOVERY_NBA_CHAMPION_PARENT = {
  id: '27830',
  title: '2026 NBA Champion',
  endDate: '2026-07-01',
  outcomes: [
    {
      id: 'outcome-nba-lakers',
      title: 'Will the Los Angeles Lakers win the 2026 NBA Finals?',
      status: 'open' as const,
      tokens: [{ title: 'Yes', price: 0.08 }],
      groupItemTitle: 'Lakers',
    },
    {
      id: 'outcome-nba-thunder',
      title: 'Will the Oklahoma City Thunder win the 2026 NBA Finals?',
      status: 'open' as const,
      tokens: [{ title: 'Yes', price: 0.22 }],
      groupItemTitle: 'Thunder',
    },
  ],
};

const worldCupMarketsWithDiscoveryChampionship = () =>
  worldCupHomepageMarketsMock([HOMEPAGE_DISCOVERY_WINNER_MARKET]);

const mockUseABTest = jest.fn(
  (): {
    variant: { layout: 'carousel' | 'list' };
    variantName: string;
    isActive: boolean;
  } => ({
    variant: { layout: 'list' },
    variantName: 'treatment',
    isActive: true,
  }),
);

jest.mock('../../../../../hooks', () => {
  const actual = jest.requireActual('../../../../../hooks');
  return {
    ...actual,
    useABTest: (...args: unknown[]) =>
      Reflect.apply(mockUseABTest, undefined, args),
  };
});

const mockUseHomepageTrendingTransactionActiveAbTests = jest.fn<
  { key: string; value: string; key_value_pair?: string }[] | undefined,
  []
>(() => undefined);

jest.mock('../../hooks/useHomepageTrendingTransactionActiveAbTests', () => ({
  useHomepageTrendingTransactionActiveAbTests: () =>
    mockUseHomepageTrendingTransactionActiveAbTests(),
}));

jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  return {
    ...actualNav,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('../../../../UI/Predict/selectors/featureFlags', () => ({
  selectPredictEnabledFlag: jest.fn(() => true),
  selectPredictHomepageDiscoveryNbaChampionEnabledFlag: jest.fn(() => true),
  selectPredictWorldCupScreenEnabledFlag: jest.fn(() => true),
  selectPredictUpDownEnabledFlag: jest.fn(() => true),
}));

jest.mock('../../../../UI/Predict/hooks/useLiveCryptoPrices', () => ({
  useLiveCryptoPrices: jest.fn(() => ({
    prices: new Map([
      ['btcusdt', { symbol: 'btcusdt', price: 97000, timestamp: 0 }],
    ]),
    getPrice: (symbol: string) =>
      symbol === 'btcusdt'
        ? { symbol: 'btcusdt', price: 97000, timestamp: 0 }
        : undefined,
    isConnected: true,
    lastUpdateTime: 0,
  })),
}));

jest.mock('../../../../UI/Predict/hooks/usePredictClaim', () => ({
  usePredictClaim: () => ({ claim: mockClaim }),
}));

jest.mock('../../../../UI/Predict/hooks/useUnrealizedPnL', () => ({
  useUnrealizedPnL: jest.fn(() => ({
    data: { cashUpnl: 10, percentUpnl: 5, user: '0x0' },
    isLoading: false,
    error: null,
  })),
}));

jest.mock('../../../../../selectors/preferencesController', () => ({
  ...jest.requireActual('../../../../../selectors/preferencesController'),
  selectPrivacyMode: jest.fn(() => false),
}));

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query');
  return {
    ...actual,
    useQueryClient: jest.fn(() => ({
      invalidateQueries: jest.fn(() => Promise.resolve()),
    })),
  };
});

// Mock the hooks
jest.mock('./hooks', () => {
  const actual = jest.requireActual('./hooks') as Record<string, unknown>;
  const tagQueries = actual.HOMEPAGE_PREDICT_TAG_QUERIES as {
    worldCup: string;
    nbaChampion: string;
  };
  // Two distinct jest mocks under the hood so tests can target each feed
  // independently (`.mockReturnValue(...)` on either still works); the
  // consolidated `useHomepagePredictTaggedMarkets` dispatches by tag query.
  const worldCupMock = jest.fn(() =>
    worldCupMarketsWithDiscoveryChampionship(),
  );
  const nbaMock = jest.fn(() =>
    worldCupHomepageMarketsMock([HOMEPAGE_DISCOVERY_NBA_CHAMPION_PARENT]),
  );
  return {
    ...actual,
    usePredictMarketsForHomepage: jest.fn(() => ({
      markets: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    usePredictPositionsForHomepage: jest.fn(() => ({
      positions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    })),
    useHomepagePredictTaggedMarkets: jest.fn(
      ({ customQueryParams }: { customQueryParams: string }) =>
        customQueryParams === tagQueries.nbaChampion
          ? nbaMock()
          : worldCupMock(),
    ),
    __mockUsePredictWorldCupHomepageMarkets: worldCupMock,
    __mockUsePredictNbaChampionHomepageMarkets: nbaMock,
  };
});

jest.mock('../../hooks/useHomeViewedEvent', () => ({
  __esModule: true,
  default: jest.fn(() => ({ onLayout: jest.fn() })),
  HomeSectionNames: {
    TOKENS: 'tokens',
    PERPS: 'perps',
    DEFI: 'defi',
    PREDICT: 'predict',
    NFTS: 'nfts',
    TRENDING_TOKENS: 'trending_tokens',
    TRENDING_PERPS: 'trending_perps',
    TRENDING_PREDICT: 'trending_predict',
  },
}));

const mockUsePredictMarketsForHomepage =
  jest.requireMock('./hooks').usePredictMarketsForHomepage;
const mockUsePredictPositionsForHomepage =
  jest.requireMock('./hooks').usePredictPositionsForHomepage;
const mockUsePredictWorldCupHomepageMarkets = jest.requireMock('./hooks')
  .__mockUsePredictWorldCupHomepageMarkets as jest.Mock;
const mockUsePredictNbaChampionHomepageMarkets = jest.requireMock('./hooks')
  .__mockUsePredictNbaChampionHomepageMarkets as jest.Mock;
const mockSelectPrivacyMode = jest.requireMock(
  '../../../../../selectors/preferencesController',
).selectPrivacyMode as jest.Mock;
const mockSelectPredictHomepageDiscoveryNbaChampionEnabledFlag =
  jest.requireMock('../../../../UI/Predict/selectors/featureFlags')
    .selectPredictHomepageDiscoveryNbaChampionEnabledFlag as jest.Mock;
const mockUseHomeViewedEvent = jest.requireMock(
  '../../hooks/useHomeViewedEvent',
).default as jest.Mock;

const mockActivePositions = [
  {
    outcomeId: 'outcome-1',
    outcomeIndex: 0,
    marketId: 'market-1',
    title: 'Test Position 1',
    outcome: 'Yes',
    icon: 'https://example.com/icon1.png',
    initialValue: 10,
    currentValue: 12,
    size: 15,
    percentPnl: 20,
    claimable: false,
  },
  {
    outcomeId: 'outcome-2',
    outcomeIndex: 0,
    marketId: 'market-2',
    title: 'Test Position 2',
    outcome: 'No',
    icon: 'https://example.com/icon2.png',
    initialValue: 5,
    currentValue: 3,
    size: 8,
    percentPnl: -40,
    claimable: false,
  },
];

const mockClaimablePositions = [
  {
    outcomeId: 'claimable-outcome-1',
    outcomeIndex: 0,
    marketId: 'claimable-market-1',
    title: 'Claimable Position',
    outcome: 'Yes',
    icon: 'https://example.com/icon-claimable.png',
    initialValue: 10,
    currentValue: 75,
    size: 75,
    percentPnl: 650,
    claimable: true,
  },
  {
    outcomeId: 'claimable-outcome-2',
    outcomeIndex: 0,
    marketId: 'claimable-market-2',
    title: 'Claimable Position 2',
    outcome: 'Yes',
    icon: 'https://example.com/icon-claimable2.png',
    initialValue: 10,
    currentValue: 125,
    size: 125,
    percentPnl: 1150,
    claimable: true,
  },
];

const mockMarkets = [
  {
    id: 'market-1',
    title: 'Will BTC reach 100k?',
    endDate: '2026-03-01',
    outcomes: [
      {
        id: 'outcome-1',
        title: 'Yes',
        status: 'open' as const,
        image: 'https://example.com/yes.png',
        tokens: [{ title: 'Yes', price: 0.55 }],
      },
      {
        id: 'outcome-2',
        title: 'No',
        status: 'open' as const,
        image: 'https://example.com/no.png',
        tokens: [{ title: 'No', price: 0.45 }],
      },
    ],
  },
];

describe('PredictionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockClaim.mockResolvedValue(undefined);
    mockSelectPrivacyMode.mockReturnValue(false);

    // Reset mock return value to default (true) to ensure test isolation
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(true);
    mockSelectPredictHomepageDiscoveryNbaChampionEnabledFlag.mockReturnValue(
      true,
    );

    // Reset hooks to default state - include a market so the section renders
    mockUsePredictMarketsForHomepage.mockReturnValue({
      markets: [
        {
          id: 'default-market',
          title: 'Default Market',
          endDate: '2026-06-01',
          outcomes: [
            {
              id: 'outcome-1',
              title: 'Yes',
              tokens: [{ title: 'Yes', price: 0.5 }],
            },
          ],
        },
      ],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
      worldCupMarketsWithDiscoveryChampionship(),
    );
    mockUsePredictNbaChampionHomepageMarkets.mockReturnValue(
      worldCupHomepageMarketsMock([HOMEPAGE_DISCOVERY_NBA_CHAMPION_PARENT]),
    );

    mockUsePredictPositionsForHomepage.mockImplementation(
      (_options: { maxPositions?: number; claimable?: boolean } = {}) => ({
        positions: [],
        isLoading: false,
        error: null,
        totalClaimableValue: 0,
        refetch: jest.fn(),
      }),
    );
    mockUseHomepageTrendingTransactionActiveAbTests.mockReturnValue(undefined);
    mockUseABTest.mockReturnValue({
      variant: { layout: 'list' as const },
      variantName: 'treatment',
      isActive: true,
    });
  });

  it('renders section title when enabled', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(screen.getByText('Predictions')).toBeOnTheScreen();
  });

  it('navigates with home_section entry_point when trending markets title is pressed', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Predictions'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        transactionActiveAbTests: predictEmptyStateTreatmentActiveAbTests,
      },
    });
  });

  it('navigates with homepage_positions entry_point when positions section title is pressed', () => {
    mockUsePredictPositionsForHomepage.mockImplementation(
      ({
        claimable = false,
      }: { maxPositions?: number; claimable?: boolean } = {}) => ({
        positions: claimable ? [] : mockActivePositions,
        isLoading: false,
        error: null,
        totalClaimableValue: 0,
        refetch: jest.fn(),
      }),
    );

    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    fireEvent.press(screen.getByText('Predictions'));

    expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
      screen: Routes.PREDICT.MARKET_LIST,
      params: {
        entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
      },
    });
  });

  it('returns null when predict is disabled', () => {
    jest
      .requireMock('../../../../UI/Predict/selectors/featureFlags')
      .selectPredictEnabledFlag.mockReturnValue(false);

    const { toJSON } = renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(toJSON()).toBeNull();
  });

  describe('when user has positions', () => {
    beforeEach(() => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );
    });

    it('renders positions when user has them', async () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
        expect(screen.getByText('Test Position 2')).toBeOnTheScreen();
      });
    });

    it('renders the current active position values from the hook data', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable
            ? []
            : [
                {
                  ...mockActivePositions[0],
                  currentValue: 99,
                  percentPnl: 890,
                },
                mockActivePositions[1],
              ],
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
      });

      expect(screen.getByText('$99')).toBeOnTheScreen();
      expect(screen.getByText('890%')).toBeOnTheScreen();
      expect(screen.queryByText('$12')).not.toBeOnTheScreen();
    });

    it('shows position skeletons when loading positions', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: !claimable, // only active positions loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText('Test Position 1')).not.toBeOnTheScreen();
    });
  });

  describe('when user has no positions', () => {
    const noPositionsTrendingMarkets = [
      {
        id: 'market-1',
        title: 'Will ETH reach $5000?',
        endDate: '2026-03-01',
        outcomes: [
          {
            id: 'outcome-1',
            title: 'Yes',
            status: 'open' as const,
            image: 'https://example.com/yes.png',
            tokens: [{ title: 'Yes', price: 0.55 }],
          },
          {
            id: 'outcome-2',
            title: 'No',
            status: 'open' as const,
            image: 'https://example.com/no.png',
            tokens: [{ title: 'No', price: 0.45 }],
          },
        ],
      },
    ];

    it('does not track Predict empty state exposure while discovery feeds are loading', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([], { isFetching: true }),
      );
      mockUsePredictNbaChampionHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([], { isFetching: true }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Predictions')).toBeOnTheScreen();
      });

      expect(mockTrackEvent).not.toHaveBeenCalledWith(
        expect.objectContaining({
          event: MetaMetricsEvents.PREDICT_EMPTY_STATE_VIEWED,
        }),
      );
    });

    it('tracks Predict empty state exposure with active AB assignment', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(mockTrackEvent).toHaveBeenCalledWith({
          event: MetaMetricsEvents.PREDICT_EMPTY_STATE_VIEWED,
          properties: {
            surface: 'predict',
            variant: 'treatment',
            active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
          },
        });
      });
    });

    it('renders trending markets when user has no positions', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('NBA 2026 Champion')).toBeOnTheScreen();
      });
    });

    it('renders FIFA World Cup winner when NBA champion discovery flag is disabled', async () => {
      mockSelectPredictHomepageDiscoveryNbaChampionEnabledFlag.mockReturnValue(
        false,
      );
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('2026 FIFA World Cup Winner'),
        ).toBeOnTheScreen();
      });
      expect(screen.queryByText('NBA 2026 Champion')).not.toBeOnTheScreen();
    });

    it('navigates to market details from sports list (treatment)', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('NBA 2026 Champion')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('NBA 2026 Champion'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '27830',
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: 'Will the Oklahoma City Thunder win the 2026 NBA Finals?',
          image: undefined,
          transactionActiveAbTests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('tracks treatment CTA clicks with CTA and category names', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('NBA 2026 Champion')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('NBA 2026 Champion'));

      expect(mockTrackEvent).toHaveBeenCalledWith({
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'nba',
          active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('tracks World Cup winner CTA clicks with the canonical category name', async () => {
      mockSelectPredictHomepageDiscoveryNbaChampionEnabledFlag.mockReturnValue(
        false,
      );
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(
          screen.getByText('2026 FIFA World Cup Winner'),
        ).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('2026 FIFA World Cup Winner'));

      expect(mockTrackEvent).toHaveBeenCalledWith({
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'world_cup',
          active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('tracks World Cup discovery CTAs with the canonical category name', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('FIFA World Cup 2026')).toBeOnTheScreen();
      });

      mockTrackEvent.mockClear();

      fireEvent.press(screen.getByText('FIFA World Cup 2026'));
      fireEvent.press(screen.getByText('Group A'));

      expect(mockTrackEvent).toHaveBeenCalledTimes(2);
      expect(mockTrackEvent).toHaveBeenNthCalledWith(1, {
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'world_cup',
          active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
      expect(mockTrackEvent).toHaveBeenNthCalledWith(2, {
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'world_cup',
          active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('shows market skeletons when loading markets', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([], { isFetching: true }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      // Should still show the title
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('still renders discovery when homepage trending markets are empty', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([]),
      );

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).not.toBeNull();
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('still renders treatment discovery when trending markets fail', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Unable to load trending markets',
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('NBA 2026 Champion')).toBeOnTheScreen();
      });
    });

    it('returns null when trending markets empty in AB control (carousel)', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('passes empty state AB attribution through control market entry', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      fireEvent.press(screen.getByText('Will ETH reach $5000?'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'market-1',
          transactionActiveAbTests: predictEmptyStateControlActiveAbTests,
        },
      });
    });
  });

  describe('error state', () => {
    it('returns null when control markets fail to load', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Network error',
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).toBeNull();
    });

    it('renders loading state instead of returning null while data is still loading', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: true,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).not.toBeNull();
    });
  });

  describe('claim button', () => {
    beforeEach(() => {
      // Show positions so the positions branch renders
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );
    });

    it('does not show claim button when there are no claimable positions', () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('shows claim button with total amount when claimable positions exist', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
    });

    it('does not show claim button while claimable positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: claimable, // claimable fetch still loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('does not show claim button while active positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: !claimable, // active fetch still loading
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
    });

    it('calls claim on press without manual refresh', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('Claim $200.00'));

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('claimable-only (no active positions)', () => {
    const setupClaimableOnly = () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : [],
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );
    };

    it('renders claim button when only claimable positions exist', async () => {
      setupClaimableOnly();

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
    });

    it('renders trending carousel above claim button when no active positions', async () => {
      setupClaimableOnly();
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
        expect(screen.getByText('NBA 2026 Champion')).toBeOnTheScreen();
      });
    });

    it('renders only claim button when no active positions and no markets', async () => {
      setupClaimableOnly();
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([]),
      );
      mockUsePredictNbaChampionHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([]),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
      expect(screen.queryByText('NBA 2026 Champion')).not.toBeOnTheScreen();
    });

    it('does not render active position rows in claimable-only state', async () => {
      setupClaimableOnly();

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
      expect(screen.queryByText('Test Position 1')).not.toBeOnTheScreen();
      expect(screen.queryByText('Test Position 2')).not.toBeOnTheScreen();
    });

    it('does not duplicate the section header when trending carousel is shown above positions', async () => {
      setupClaimableOnly();
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });

      // Title should appear exactly once — from the discovery list header.
      // The positions header is gated by showHeader=false in this branch.
      expect(screen.getAllByText('Predictions')).toHaveLength(1);
    });

    it('does not show unrealized PnL row when trending carousel is above positions', async () => {
      setupClaimableOnly();
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupMarketsWithDiscoveryChampionship(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });

      // showHeader=false when discovery list is above positions,
      // so the unrealized PnL row must not render even if the hook returns data
      expect(screen.queryByText(/P&L/i)).not.toBeOnTheScreen();
      expect(screen.queryByText(/PnL/i)).not.toBeOnTheScreen();
    });
  });

  describe('positions-only mode with claimable-only', () => {
    it('renders claim button when only claimable positions exist', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : [],
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
    });

    it('returns null when no active and no claimable positions', () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        (_options: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });

  describe('privacy mode', () => {
    beforeEach(() => {
      mockSelectPrivacyMode.mockReturnValue(true);
    });

    it('hides monetary values on position rows', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? [] : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
      });

      expect(screen.queryByText('$10 on Yes to win $15')).toBeNull();
      expect(screen.queryByText('$12')).toBeNull();
      expect(screen.queryByText('20%')).toBeNull();
      expect(screen.queryByText('-40%')).toBeNull();
      expect(screen.queryAllByText(/•+/).length).toBeGreaterThan(0);
    });

    it('masks claim amount and still invokes claim on press', async () => {
      mockUsePredictPositionsForHomepage.mockImplementation(
        ({
          claimable = false,
        }: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: claimable ? mockClaimablePositions : mockActivePositions,
          isLoading: false,
          error: null,
          totalClaimableValue: claimable ? 200 : 0,
          refetch: jest.fn(),
        }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId(
            PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON,
          ),
        ).toBeOnTheScreen();
      });

      expect(screen.queryByText('Claim $200.00')).toBeNull();

      fireEvent.press(
        screen.getByTestId(PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON),
      );

      await waitFor(() => {
        expect(mockClaim).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('refresh functionality', () => {
    it('refreshes both positions and markets on pull-to-refresh', async () => {
      const mockRefetchPositions = jest.fn().mockResolvedValue(undefined);
      const mockRefetchMarkets = jest.fn().mockResolvedValue(undefined);

      mockUsePredictPositionsForHomepage.mockImplementation(
        (_options: { maxPositions?: number; claimable?: boolean } = {}) => ({
          positions: [],
          isLoading: false,
          error: null,
          totalClaimableValue: 0,
          refetch: mockRefetchPositions,
        }),
      );
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: mockRefetchMarkets,
      });

      const ref = React.createRef<{ refresh: () => Promise<void> }>();
      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={1}
          ref={ref}
        />,
      );

      await ref.current?.refresh();

      expect(mockRefetchPositions).toHaveBeenCalled();
      expect(mockRefetchMarkets).toHaveBeenCalled();
    });
  });

  describe('mode="positions-only"', () => {
    it('renders positions when user has positions', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockActivePositions,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
    });

    it('navigates with homepage_positions entry_point on title press', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: mockActivePositions,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      fireEvent.press(screen.getByText('Predictions'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.HOMEPAGE_POSITIONS,
        },
      });
    });

    it('returns null when no positions after loading', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });

    it('passes itemCount 0 when positions-only has no positions even if markets load', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue({
        positions: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="positions-only"
        />,
      );

      expect(mockUseHomeViewedEvent).toHaveBeenLastCalledWith(
        expect.objectContaining({ itemCount: 0, isEmpty: true }),
      );
    });
  });

  describe('mode="trending-only"', () => {
    const worldCupHookForTrending = (markets: typeof mockMarkets) =>
      worldCupHomepageMarketsMock([
        { ...markets[0], title: '2026 FIFA World Cup Winner', id: 'market-1' },
      ]);

    it('renders markets carousel when markets are available', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHookForTrending(mockMarkets),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      expect(screen.getByText('Will BTC reach 100k?')).toBeOnTheScreen();
    });

    it('navigates to market details with transactionActiveAbTests from carousel (control)', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      const abTests = [
        {
          key: 'homeTMCU470AbtestTrendingSections',
          value: 'trendingSections',
          key_value_pair: 'homeTMCU470AbtestTrendingSections=trendingSections',
        },
      ];
      mockUseHomepageTrendingTransactionActiveAbTests.mockReturnValue(abTests);
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHookForTrending(mockMarkets),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      fireEvent.press(screen.getByText('Will BTC reach 100k?'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: 'market-1',
          transactionActiveAbTests: abTests,
        },
      });
    });

    it('navigates to market details from sports list when treatment', () => {
      const abTests = [
        {
          key: 'homeTMCU470AbtestTrendingSections',
          value: 'trendingSections',
          key_value_pair: 'homeTMCU470AbtestTrendingSections=trendingSections',
        },
      ];
      mockUseHomepageTrendingTransactionActiveAbTests.mockReturnValue(abTests);
      mockUseABTest.mockReturnValue({
        variant: { layout: 'list' as const },
        variantName: 'treatment',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHookForTrending(mockMarkets),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      fireEvent.press(screen.getByText('NBA 2026 Champion'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '27830',
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: 'Will the Oklahoma City Thunder win the 2026 NBA Finals?',
          image: undefined,
          transactionActiveAbTests: abTests,
        },
      });
    });

    it('uses titleOverride when provided', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHookForTrending(mockMarkets),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
          titleOverride="Trending predictions"
        />,
      );

      expect(screen.getByText('Trending predictions')).toBeOnTheScreen();
    });

    it('navigates with home_section entry_point on title press', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: mockMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHookForTrending(mockMarkets),
      );

      renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      fireEvent.press(screen.getByText('Predictions'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_LIST,
        params: {
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
        },
      });
    });

    it('renders when homepage trending markets are empty (sports discovery)', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([]),
      );

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      expect(toJSON()).not.toBeNull();
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('returns null when homepage trending empty in AB control (carousel)', () => {
      mockUseABTest.mockReturnValue({
        variant: { layout: 'carousel' as const },
        variantName: 'control',
        isActive: true,
      });
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUsePredictWorldCupHomepageMarkets.mockReturnValue(
        worldCupHomepageMarketsMock([]),
      );

      const { toJSON } = renderWithProvider(
        <PredictionsSection
          sectionIndex={0}
          totalSectionsLoaded={5}
          mode="trending-only"
        />,
      );

      expect(toJSON()).toBeNull();
    });
  });
});
