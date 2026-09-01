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
import { MAX_POSITIONS_DISPLAYED } from './predictionsSectionConstants';

const mockNavigate = jest.fn();
const mockTrackEvent = jest.fn();
const mockIsFocused = jest.fn(() => true);
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

const HOMEPAGE_DISCOVERY_NFL_MARKET = {
  ...HOMEPAGE_DISCOVERY_MARKET_BASE,
  id: '202857',
  title: 'Pro Football: 2027 Champion',
  slug: 'pro-football-2027-champion-20260729185915366',
};

const HOMEPAGE_DISCOVERY_EPL_MARKET = {
  ...HOMEPAGE_DISCOVERY_MARKET_BASE,
  id: '659518',
  title: 'EPL: 2027 Champion',
  slug: 'epl-2027-champion-20260701200428749',
};

const homepageMarketSlotsMock = () =>
  homepageMarketSlotsResultMock([
    HOMEPAGE_DISCOVERY_NFL_MARKET,
    HOMEPAGE_DISCOVERY_EPL_MARKET,
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
    useIsFocused: () => mockIsFocused(),
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

const mockPositionsHookResult = (
  overrides: {
    positions?: typeof mockActivePositions;
    isLoading?: boolean;
    error?: string | null;
    refetch?: jest.Mock;
  } = {},
) => ({
  positions: overrides.positions ?? [],
  isLoading: overrides.isLoading ?? false,
  error: overrides.error ?? null,
  refetch: overrides.refetch ?? jest.fn(),
});

describe('PredictionsSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFocused.mockReturnValue(true);
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

    mockUsePredictPositionsForHomepage.mockReturnValue({
      positions: [],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });
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

  it('limits active homepage positions without limiting claimable aggregation', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(mockUsePredictPositionsForHomepage).toHaveBeenCalledWith({
      maxPositions: MAX_POSITIONS_DISPLAYED,
      enabled: true,
    });
    expect(mockUsePredictPositionsForHomepage).toHaveBeenCalledWith({
      claimable: true,
      enabled: true,
    });
  });

  it('skips trending market fetches for treatment discovery', () => {
    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(mockUsePredictMarketsForHomepage).toHaveBeenCalledWith(5, {
      enabled: false,
    });
    expect(mockUseHomepagePredictMarketSlots).toHaveBeenCalledWith({
      enabled: true,
    });
  });

  it('fetches trending markets for control discovery', () => {
    mockUseABTest.mockReturnValue({
      variant: { layout: 'carousel' as const },
      variantName: 'control',
      isActive: true,
    });
    mockUsePredictMarketsForHomepage.mockReturnValue({
      markets: [HOMEPAGE_DISCOVERY_EPL_MARKET],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    renderWithProvider(
      <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
    );

    expect(mockUsePredictMarketsForHomepage).toHaveBeenCalledWith(5, {
      enabled: true,
    });
    expect(mockUseHomepagePredictMarketSlots).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it.each([true, false])(
    'sets crypto up/down market data enabled to %s based on homepage focus',
    (isFocused) => {
      const { useCurrentCryptoUpDownMarketData } = jest.requireMock(
        '../../../../UI/Predict/hooks/useCurrentCryptoUpDownMarketData',
      ) as {
        useCurrentCryptoUpDownMarketData: jest.Mock;
      };
      mockIsFocused.mockReturnValue(isFocused);

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(useCurrentCryptoUpDownMarketData).toHaveBeenCalledWith(
        expect.objectContaining({ enabled: isFocused }),
      );
    },
  );

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
    mockUsePredictPositionsForHomepage.mockReturnValue(
      mockPositionsHookResult({ positions: mockActivePositions }),
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
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ positions: mockActivePositions }),
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
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({
          positions: [
            {
              ...mockActivePositions[0],
              currentValue: 99,
              percentPnl: 890,
            },
            mockActivePositions[1],
          ],
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
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ isLoading: true }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(screen.queryByText('Test Position 1')).not.toBeOnTheScreen();
    });

    it('renders unrealized PnL row for open positions', async () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
      });

      expect(
        screen.getByTestId('homepage-predict-unrealized-pnl'),
      ).toBeOnTheScreen();
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
        expect(
          screen.getByText('Pro Football: 2027 Champion'),
        ).toBeOnTheScreen();
        expect(screen.getByText('EPL: 2027 Champion')).toBeOnTheScreen();
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
          screen.getByTestId('homepage-predict-discovery-market-slot-1'),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId('homepage-predict-discovery-btc-row'),
        ).toBeOnTheScreen();
        expect(
          screen.getByTestId('homepage-predict-discovery-market-slot-3'),
        ).toBeOnTheScreen();
      });
      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-1'),
        ).getByText('Pro Football: 2027 Champion'),
      ).toBeOnTheScreen();
      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-3'),
        ).getByText('EPL: 2027 Champion'),
      ).toBeOnTheScreen();
    });

    it('navigates to the NFL market details from slot 1', async () => {
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
          screen.getByText('Pro Football: 2027 Champion'),
        ).toBeOnTheScreen();
      });

      fireEvent.press(screen.getByText('Pro Football: 2027 Champion'));

      expect(mockNavigate).toHaveBeenCalledWith(Routes.PREDICT.ROOT, {
        screen: Routes.PREDICT.MARKET_DETAILS,
        params: {
          marketId: '202857',
          entryPoint: PredictEventValues.ENTRY_POINT.HOME_SECTION,
          title: 'Pro Football: 2027 Champion',
          image: undefined,
          transactionActiveAbTests: predictEmptyStateTreatmentActiveAbTests,
        },
      });
    });

    it('navigates to the EPL market details from slot 3', async () => {
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

    it('tracks the NFL slot click as a sports CTA', async () => {
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
          screen.getByText('Pro Football: 2027 Champion'),
        ).toBeOnTheScreen();
      });

      mockTrackEvent.mockClear();

      fireEvent.press(screen.getByText('Pro Football: 2027 Champion'));

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
        screen.getByTestId('homepage-predict-discovery-market-slot-1'),
      ).toBeOnTheScreen();
      expect(
        screen.getByTestId('homepage-predict-discovery-btc-row'),
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
        homepageMarketSlotsResultMock([HOMEPAGE_DISCOVERY_NFL_MARKET]),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(
        within(
          screen.getByTestId('homepage-predict-discovery-market-slot-1'),
        ).getByText('Pro Football: 2027 Champion'),
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

  describe('claim CTA', () => {
    const expectNoClaimCta = () => {
      expect(
        screen.queryByTestId(
          PREDICT_CLAIM_BUTTON_TEST_IDS.PREDICT_CLAIM_BUTTON,
        ),
      ).not.toBeOnTheScreen();
      expect(screen.queryByText(/Claim \$/)).not.toBeOnTheScreen();
      expect(screen.queryByText(/Claim winnings/i)).not.toBeOnTheScreen();
    };

    it('does not fetch claimable positions for the homepage section', () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expect(mockUsePredictPositionsForHomepage).toHaveBeenCalledWith({
        enabled: true,
      });
      expect(mockUsePredictPositionsForHomepage).not.toHaveBeenCalledWith(
        expect.objectContaining({ claimable: true }),
      );
    });

    it('does not render claim button when user has open positions', async () => {
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ positions: mockActivePositions }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Test Position 1')).toBeOnTheScreen();
      });

      expectNoClaimCta();
    });

    it('does not render claim button when user has no open positions', async () => {
      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      await waitFor(() => {
        expect(screen.getByText('Predictions')).toBeOnTheScreen();
      });

      expectNoClaimCta();
    });

    it('does not render claim button while open positions are loading', () => {
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ isLoading: true }),
      );

      renderWithProvider(
        <PredictionsSection sectionIndex={0} totalSectionsLoaded={1} />,
      );

      expectNoClaimCta();
    });
  });

  describe('privacy mode', () => {
    beforeEach(() => {
      mockSelectPrivacyMode.mockReturnValue(true);
    });

    it('hides monetary values on position rows', async () => {
      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ positions: mockActivePositions }),
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
  });

  describe('refresh functionality', () => {
    it('refreshes both positions and markets on pull-to-refresh', async () => {
      const mockRefetchPositions = jest.fn().mockResolvedValue(undefined);
      const mockRefetchMarkets = jest.fn().mockResolvedValue(undefined);

      mockUsePredictPositionsForHomepage.mockReturnValue(
        mockPositionsHookResult({ refetch: mockRefetchPositions }),
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
