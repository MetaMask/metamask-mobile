import React from 'react';
import {
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react-native';
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

const homepageMarketSlotsResultMock = (
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

const HOMEPAGE_DISCOVERY_MARKET_BASE = {
  id: 'market-1',
  title: 'Championship Market',
  slug: 'championship-market',
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

const HOMEPAGE_DISCOVERY_EPL_MARKET = {
  ...HOMEPAGE_DISCOVERY_MARKET_BASE,
  id: '659518',
  title: 'EPL: 2027 Champion',
  slug: 'epl-2027-champion-20260701200428749',
};

const HOMEPAGE_DISCOVERY_NBA_MARKET = {
  ...HOMEPAGE_DISCOVERY_MARKET_BASE,
  id: '478277',
  title: 'NBA: 2027 Champion',
  slug: 'nba-2027-champion',
};

const homepageMarketSlotsMock = () =>
  homepageMarketSlotsResultMock([
    HOMEPAGE_DISCOVERY_EPL_MARKET,
    HOMEPAGE_DISCOVERY_NBA_MARKET,
  ]);

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

jest.mock(
  '../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData',
  () => ({
    useCurrentCryptoUpDownMarketData: jest.fn(() => ({
      marketId: undefined,
      market: undefined,
      currentPrice: undefined,
      priceToBeat: undefined,
      countdown: '--:--',
      isLoading: false,
      isFetching: false,
    })),
  }),
);

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
  const marketSlots = jest.fn(() => homepageMarketSlotsMock());
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
    useHomepagePredictMarketSlots: marketSlots,
    __mockUseHomepagePredictMarketSlots: marketSlots,
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
  },
}));

const mockUsePredictMarketsForHomepage =
  jest.requireMock('./hooks').usePredictMarketsForHomepage;
const mockUsePredictPositionsForHomepage =
  jest.requireMock('./hooks').usePredictPositionsForHomepage;
const mockUseHomepagePredictMarketSlots = jest.requireMock('./hooks')
  .__mockUseHomepagePredictMarketSlots as jest.Mock;
const mockSelectPrivacyMode = jest.requireMock(
  '../../../../../selectors/preferencesController',
).selectPrivacyMode as jest.Mock;
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

    mockUseHomepagePredictMarketSlots.mockReturnValue(
      homepageMarketSlotsMock(),
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsResultMock([], { isFetching: true }),
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

    it('renders all configured markets when user has no positions', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
        expect(screen.getByText('NBA: 2027 Champion')).toBeOnTheScreen();
      });
    });

    it('renders configured championship markets in slot order', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(
          screen.getByTestId('homepage-predict-discovery-market-slot-2'),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId('homepage-predict-discovery-market-slot-3'),
        ).toBeOnTheScreen();
      });
      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-2'),
        ).getByText('EPL: 2027 Champion'),
      ).toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-3'),
        ).getByText('NBA: 2027 Champion'),
      ).toBeOnTheScreen();
    });

    it('navigates to the EPL market details from slot 2', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('EPL: 2027 Champion'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '659518',
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: 'EPL: 2027 Champion',
          image: undefined,
          transactionActiveAbTests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('tracks the EPL slot click as a sports CTA', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('EPL: 2027 Champion'));

      expect(mockTrackEvent).toHaveBeenCalledWith({
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'sports',
          active_ab_tests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('tracks the NBA slot click as a sports CTA', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: noPositionsTrendingMarkets,
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('NBA: 2027 Champion')).toBeOnTheScreen();
      });

      mockTrackEvent.mockClear();

      fireEvent.press(screen.getByText('NBA: 2027 Champion'));

      expect(mockTrackEvent).toHaveBeenCalledTimes(1);
      expect(mockTrackEvent).toHaveBeenCalledWith({
        event: MetaMetricsEvents.PREDICT_EMPTY_STATE_CTA_CLICKED,
        properties: {
          cta_name: 'browse_category',
          category_name: 'sports',
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsResultMock([], { isFetching: true }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.getByText('Predictions')).toBeOnTheScreen();
      expect(
        screen.getByTestId('homepage-predict-discovery-market-slot-2'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('homepage-predict-discovery-market-slot-3'),
      ).toBeOnTheScreen();
    });

    it('still renders discovery when carousel markets are empty', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsResultMock([]),
      );

      const { toJSON } = renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(toJSON()).not.toBeNull();
      expect(screen.getByText('Predictions')).toBeOnTheScreen();
    });

    it('renders an unavailable state only for a missing configured event', () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: null,
        refetch: jest.fn(),
      });
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsResultMock([HOMEPAGE_DISCOVERY_EPL_MARKET]),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-2'),
        ).getByText('EPL: 2027 Champion'),
      ).toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-3'),
        ).getByText('No championship market to show yet.'),
      ).toBeOnTheScreen();
    });

    it('still renders treatment discovery when trending markets fail', async () => {
      mockUsePredictMarketsForHomepage.mockReturnValue({
        markets: [],
        isLoading: false,
        error: 'Unable to load trending markets',
        refetch: jest.fn(),
      });
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsMock(),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsResultMock([]),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Claim $200.00')).toBeOnTheScreen();
      });
      expect(screen.queryByText('EPL: 2027 Champion')).not.toBeOnTheScreen();
      expect(screen.queryByText('NBA: 2027 Champion')).not.toBeOnTheScreen();
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsMock(),
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
      mockUseHomepagePredictMarketSlots.mockReturnValue(
        homepageMarketSlotsMock(),
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
});
