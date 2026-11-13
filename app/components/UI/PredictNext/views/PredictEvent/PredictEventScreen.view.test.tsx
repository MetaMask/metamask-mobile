import '../../../../../../tests/component-view/mocks';
import { lightTheme } from '@metamask/design-tokens';
import {
  composePredictNextOrderService,
  composePredictNextPortfolioTrading,
  configurePredictNextFeeds,
  makePredictNextCompositeGameEvent,
  makePredictNextLaidOutGameEvent,
  makePredictNextMultiMarketEvent,
  makePredictNextPlayerPropsEvent,
  makePredictNextPosition,
  makePredictNextSellPreview,
  makePredictNextSellReceipt,
  makePredictNextSpreadsEvent,
  makePredictNextTotalsEvent,
  mockPredictNextMessenger,
  publishPredictNextGameLiveUpdate,
  publishPredictNextQuoteUpdate,
} from '../../../../../../tests/component-view/fixtures/predictNext';
import { renderPredictEventScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { focusManager } from '@tanstack/react-query';
import NetInfo from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import {
  processColor,
  StyleSheet,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { MarketStandardCardTestIds } from '../../events/markets/MarketStandardCard.testIds';
import { MarketGroupCardTestIds } from '../../events/markets/MarketGroupCard.testIds';
import type {
  PredictDecimal,
  PredictEntityId,
  PredictHttpsUrl,
  PredictEvent,
  PredictHexColor,
  PredictMarket,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictOrderFlowTestIds } from '../PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { PredictMarketHistoryTestIds } from './internal/PredictMarketHistory.testIds';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';
import { RulesBottomSheetTestIds } from './internal/RulesBottomSheet.testIds';
import { EventMarketListTestIds } from './internal/EventMarketList.testIds';
import { EventMarketLayoutSectionTestIds } from './internal/EventMarketLayoutSection.testIds';
import { EventMarketPeriodChipsTestIds } from './internal/EventMarketPeriodChips.testIds';
import { EventMarketSectionTestIds } from './internal/EventMarketSection.testIds';
import { strings } from '../../../../../../locales/i18n';
import { Messenger } from '@metamask/messenger';
import {
  PREDICT_LIVE_DATA_SERVICE_NAME,
  PredictLiveDataService,
  type PredictLiveDataServiceMessenger,
} from '../../services/PredictLiveDataService';
import {
  PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION,
  PredictLiveDataClient,
  type PredictLiveDataClientOptions,
} from '../../adapters/remote/PredictLiveDataClient';
import { EVENT_LIST_LIVE_MARKET_BUDGET } from './internal/EventMarketList';
import { TOP_CHART_MARKET_LIMIT } from './internal/selectTopChartMarkets';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
const awayTeamColor = `#${'241773'}` as PredictHexColor;
const homeTeamColor = `#${'E31837'}` as PredictHexColor;
const routeParams = {
  venueId,
  eventId,
  titleSnapshot: 'Snapshot Event title',
};

const createScrollEvent = (
  x: number,
): NativeSyntheticEvent<NativeScrollEvent> =>
  ({
    nativeEvent: {
      contentOffset: { x, y: 0 },
      velocity: { x: 0, y: 0 },
    },
  }) as NativeSyntheticEvent<NativeScrollEvent>;

const createEvent = (overrides: Partial<PredictEvent> = {}): PredictEvent => ({
  venueId,
  id: eventId,
  title: 'Canonical Event title',
  subtitle: 'Canonical Event subtitle',
  imageUrl: 'https://example.com/event.png',
  markets: [
    {
      id: 'market-1' as PredictEntityId,
      question: 'Will it happen?',
      status: 'active',
      outcomes: [
        { id: 'yes' as PredictEntityId, side: 'yes', label: 'Yes' },
        { id: 'no' as PredictEntityId, side: 'no', label: 'No' },
      ],
    },
  ],
  ...overrides,
});

const createMultiMarketEvent = (): PredictEvent => ({
  ...makePredictNextMultiMarketEvent(),
  venueId,
  id: eventId,
});

type GameTeamLogoUrl = NonNullable<
  NonNullable<
    NonNullable<PredictEvent['sports']>['game']
  >['homeTeam']['logoUrl']
>;
const headerAwayLogoUrl = 'https://example.com/ari.png' as GameTeamLogoUrl;
const headerHomeLogoUrl = 'https://example.com/car.png' as GameTeamLogoUrl;

const createGameEvent = (
  overrides: Partial<
    NonNullable<NonNullable<PredictEvent['sports']>['game']>
  > = {},
): PredictEvent =>
  createEvent({
    title: 'Arizona Cardinals vs Carolina Panthers',
    startsAt: '2026-09-11T00:20:00Z' as PredictTimestamp,
    sports: {
      sport: {
        id: 'american-football' as PredictEntityId,
        label: 'American football',
      },
      competition: { id: 'nfl' as PredictEntityId, label: 'NFL' },
      game: {
        status: 'in_progress',
        awayTeam: {
          name: 'Arizona Cardinals',
          abbreviation: 'ARI',
          primaryColor: awayTeamColor,
          logoUrl: 'https://example.com/ari.png' as NonNullable<
            NonNullable<
              NonNullable<PredictEvent['sports']>['game']
            >['awayTeam']['logoUrl']
          >,
          logoFacing: 'right',
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          primaryColor: homeTeamColor,
          logoFacing: 'right',
        },
        score: { away: '17', home: '21' },
        period: 'Q4',
        clock: '12:22',
        observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
        ...overrides,
      },
    },
  });

const createGameEventWithTeamMarkets = () => {
  const gameEvent = createGameEvent();
  const baseMarket = gameEvent.markets[0];
  const awayMarket = {
    ...baseMarket,
    id: 'away-market' as PredictEntityId,
    outcomes: [
      {
        ...baseMarket.outcomes[0],
        id: 'away-yes' as PredictEntityId,
        label: 'Arizona Cardinals',
        askPrice: '0.47' as PredictDecimal,
        gameSelection: 'away' as const,
      },
      { ...baseMarket.outcomes[1], id: 'away-no' as PredictEntityId },
    ] as typeof baseMarket.outcomes,
  };
  const homeMarket = {
    ...baseMarket,
    id: 'home-market' as PredictEntityId,
    outcomes: [
      {
        ...baseMarket.outcomes[0],
        id: 'home-yes' as PredictEntityId,
        label: 'Carolina Panthers',
        askPrice: '0.53' as PredictDecimal,
        gameSelection: 'home' as const,
      },
      { ...baseMarket.outcomes[1], id: 'home-no' as PredictEntityId },
    ] as typeof baseMarket.outcomes,
  };

  return {
    event: { ...gameEvent, markets: [awayMarket, homeMarket] },
    awayMarket,
    homeMarket,
  };
};

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;
const netInfoMock = NetInfo as unknown as typeof NetInfoMock;

const expectMessengerCalledWith = (...prefix: unknown[]) => {
  expect(messengerCall.mock.calls).toEqual(
    expect.arrayContaining([expect.arrayContaining(prefix)]),
  );
};

const createHistory = (marketId: string, range = 'ALL', pointCount = 2) => ({
  venueId,
  marketId,
  range,
  observedAt: '2026-08-17T20:00:00Z',
  points: [
    { timestamp: '2026-08-17T18:00:00Z', yesPrice: '0.40', noPrice: '0.60' },
    { timestamp: '2026-08-17T20:00:00Z', yesPrice: '0.42', noPrice: '0.58' },
  ].slice(0, pointCount),
});

const createTopMarket = (
  id: string,
  label: string,
  yesAskPrice?: string,
  status: PredictEvent['markets'][number]['status'] = 'active',
): PredictEvent['markets'][number] => ({
  id: id as PredictEntityId,
  question: `Will ${label} win?`,
  status,
  outcomes: [
    {
      id: `${id}-yes` as PredictEntityId,
      side: 'yes',
      label,
      askPrice: yesAskPrice as PredictDecimal | undefined,
    },
    { id: `${id}-no` as PredictEntityId, side: 'no', label: `Not ${label}` },
  ],
});

// Drake, Ella Langley and Taylor Swift lead; the closed and unpriced Markets
// never chart, and Kacey Musgraves ranks fourth.
const createTopMarketsEvent = () =>
  createEvent({
    markets: [
      createTopMarket('taylor', 'Taylor Swift', '0.05'),
      createTopMarket('drake', 'Drake', '0.81'),
      createTopMarket('closed', 'Closed Act', '0.9', 'closed'),
      createTopMarket('ella', 'Ella Langley', '0.14'),
      createTopMarket('kacey', 'Kacey Musgraves', '0.03'),
      createTopMarket('unpriced', 'Unpriced Act'),
    ],
  });

const TOP_MARKET_IDS = ['drake', 'ella', 'taylor'] as const;
// Theme colors of the top Markets, in rank order.
const topMarketColors = [
  lightTheme.colors.success.default,
  lightTheme.colors.primary.default,
  lightTheme.colors.warning.default,
];

const publishTopMarketQuote = ({
  marketId,
  yesAskPrice,
  lastPrice,
  updatedAt = '2026-08-17T21:00:00.000Z',
}: {
  marketId: string;
  yesAskPrice?: string;
  lastPrice?: string;
  updatedAt?: string;
}) =>
  act(() => {
    publishPredictNextQuoteUpdate({
      venueId,
      marketId: marketId as PredictEntityId,
      outcomes: [
        {
          id: `${marketId}-yes` as PredictEntityId,
          side: 'yes',
          askPrice: yesAskPrice as PredictDecimal | undefined,
        },
        { id: `${marketId}-no` as PredictEntityId, side: 'no' },
      ],
      lastPrice: lastPrice as PredictDecimal | undefined,
      updatedAt: updatedAt as PredictTimestamp,
    });
  });

const getHistoryCalls = (marketId: string, range = 'ALL') =>
  messengerCall.mock.calls.filter(
    ([action, , id, callRange]) =>
      action === 'PredictMarketDataService:getMarketHistory' &&
      id === marketId &&
      callRange === range,
  );

const resolveEvent = (event: PredictEvent = createEvent()) => {
  mockPredictNextMessenger(
    (action: string, _venueId: string, id: string, range?: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(event);
      }
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return Promise.resolve(createHistory(id, range));
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId, positions: [] });
      }
      return Promise.resolve(undefined);
    },
  );
};

const resolveEventForRoute = (event: PredictEvent): void => {
  resolveEvent({ ...event, venueId, id: eventId });
};

const HIDDEN = { includeHiddenElements: true };

// The Event headers mount only after the Event query settles, which a loaded
// CV shard can push past findBy's 1s default.
const EVENT_LOAD = { timeout: 5000 };

describe('PredictEventScreen', () => {
  beforeEach(() => {
    messengerCall.mockReset();
    jest.clearAllMocks();
  });

  afterEach(() => {
    focusManager.setFocused(undefined);
  });

  it('keeps the route title visible while the immutable Event loads', async () => {
    messengerCall.mockReturnValue(new Promise(() => undefined));
    const view = renderPredictEventScreen(routeParams);

    await waitFor(() =>
      expect(
        view.getByTestId(PredictEventScreenTestIds.LOADING),
      ).toBeOnTheScreen(),
    );

    expect(view.getByTestId(PredictEventScreenTestIds.TITLE)).toHaveTextContent(
      routeParams.titleSnapshot,
    );
    expect(
      view.queryByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('renders the standard Event header as one bar: back, image, title over category', async () => {
    resolveEvent(createEvent({ category: 'Politics' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.BACK),
    ).toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.IMAGE),
    ).toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.TITLE),
    ).toHaveTextContent('Canonical Event title');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.CATEGORY),
    ).toHaveTextContent('Politics');
    expect(view.getAllByTestId(PredictEventScreenTestIds.TITLE)).toHaveLength(
      1,
    );
    // The subtitle row under the bar is gone.
    expect(view.queryByText('Canonical Event subtitle')).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
  });

  it('shows a long standard Event title in full and lets the bar grow', async () => {
    const longTitle =
      'Will the winner of the next United States presidential election be ' +
      'inaugurated before January 20, 2029, after a contested certification?';
    expect(longTitle.length).toBeGreaterThan(130);
    resolveEvent(createEvent({ title: longTitle, category: 'Politics' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );
    const title = within(header).getByTestId(PredictEventScreenTestIds.TITLE);

    expect(title).toHaveTextContent(longTitle);
    expect(title.props.numberOfLines).toBeUndefined();
    expect(title.props.ellipsizeMode).toBeUndefined();
    const headerStyle = StyleSheet.flatten(header.props.style);
    expect(headerStyle.height).not.toBe(56);
    expect(headerStyle.minHeight).toBe(56);
  });

  describe('standard Event top Markets chart', () => {
    const renderTopMarkets = async () => {
      resolveEvent(createTopMarketsEvent());
      const view = renderPredictEventScreen(routeParams);
      const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);
      fireEvent(chart, 'layout', {
        nativeEvent: { layout: { width: 343, height: 150 } },
      });
      return view;
    };
    const getLegendValues = (
      view: Awaited<ReturnType<typeof renderTopMarkets>>,
    ) =>
      within(view.getByTestId(PredictMarketHistoryTestIds.LEGEND))
        .getAllByTestId(/^predict-market-history-legend-value-/)
        .map((value) => value.props.testID);

    it('charts the three highest yes asks with a legend in rank order', async () => {
      const view = await renderTopMarkets();

      const legend = view.getByTestId(PredictMarketHistoryTestIds.LEGEND);
      expect(legend).toHaveTextContent('Drake81%Ella Langley14%Taylor Swift5%');
      expect(getLegendValues(view)).toEqual(
        TOP_MARKET_IDS.map(PredictMarketHistoryTestIds.legendValue),
      );
      TOP_MARKET_IDS.forEach((marketId, index) => {
        expect(getHistoryCalls(marketId)).not.toHaveLength(0);
        expect(
          view.getByTestId(
            `${PredictMarketHistoryTestIds.CHART}-line-${marketId}`,
          ).props.stroke.payload,
        ).toEqual(processColor(topMarketColors[index]));
      });
      ['closed', 'kacey', 'unpriced'].forEach((marketId) => {
        expect(getHistoryCalls(marketId)).toHaveLength(0);
        expect(
          view.queryByTestId(PredictMarketHistoryTestIds.legendItem(marketId)),
        ).not.toBeOnTheScreen();
      });
      // Line ends show the legend's live yes ask, not the last history point.
      await waitFor(() =>
        expect(
          view.getByLabelText(/Drake 81%, Ella Langley 14%, Taylor Swift 5%/),
        ).toBeOnTheScreen(),
      );
    });

    it('charts as many Markets as are eligible', async () => {
      resolveEvent(
        createEvent({
          markets: [
            createTopMarket('drake', 'Drake', '0.81'),
            createTopMarket('closed', 'Closed Act', '0.9', 'closed'),
            createTopMarket('unpriced', 'Unpriced Act'),
          ],
        }),
      );
      const view = renderPredictEventScreen(routeParams);

      await view.findByTestId(PredictMarketHistoryTestIds.CHART);

      expect(getLegendValues(view)).toEqual([
        PredictMarketHistoryTestIds.legendValue('drake'),
      ]);
    });

    it('renders no chart when no Market is eligible', async () => {
      resolveEvent(
        createEvent({
          markets: [
            createTopMarket('closed', 'Closed Act', '0.9', 'closed'),
            createTopMarket('unpriced', 'Unpriced Act'),
          ],
        }),
      );
      const view = renderPredictEventScreen(routeParams);

      await view.findByTestId(
        PredictEventScreenTestIds.STANDARD_HEADER,
        {},
        EVENT_LOAD,
      );

      expect(
        view.queryByTestId(PredictMarketHistoryTestIds.VIEW),
      ).not.toBeOnTheScreen();
      expect(messengerCall).not.toHaveBeenCalledWith(
        'PredictMarketDataService:getMarketHistory',
        expect.anything(),
        expect.anything(),
        expect.anything(),
      );
    });

    it('keeps the charted Markets when a live quote reorders them', async () => {
      const view = await renderTopMarkets();

      publishTopMarketQuote({ marketId: 'kacey', yesAskPrice: '0.95' });
      publishTopMarketQuote({ marketId: 'drake', yesAskPrice: '0.7' });

      await waitFor(() =>
        expect(
          view.getByTestId(PredictMarketHistoryTestIds.legendValue('drake')),
        ).toHaveTextContent('70%'),
      );
      expect(
        view.getByTestId(MarketStandardCardTestIds.yesButton('kacey')),
      ).toHaveTextContent(/95¢/);
      expect(getLegendValues(view)).toEqual(
        TOP_MARKET_IDS.map(PredictMarketHistoryTestIds.legendValue),
      );
      expect(view.getByLabelText(/Drake 70%/)).toBeOnTheScreen();
      expect(getHistoryCalls('kacey')).toHaveLength(0);
    });

    it('shows a dash in the legend when a charted ask disappears', async () => {
      const view = await renderTopMarkets();

      publishTopMarketQuote({ marketId: 'ella' });

      await waitFor(() =>
        expect(
          view.getByTestId(PredictMarketHistoryTestIds.legendValue('ella')),
        ).toHaveTextContent('–'),
      );
      expect(
        view.getByTestId(PredictMarketHistoryTestIds.legendItem('ella')),
      ).toBeOnTheScreen();
      // The line end agrees with the legend, not the last plotted price.
      expect(view.getByLabelText(/Ella Langley –/)).toBeOnTheScreen();
    });

    it('moves a line end to the last trade on the ALL range', async () => {
      const view = await renderTopMarkets();
      const drakeLine = () =>
        view.getByTestId(`${PredictMarketHistoryTestIds.CHART}-line-drake`)
          .props.d as string;
      const beforeQuote = drakeLine();

      publishTopMarketQuote({
        marketId: 'drake',
        yesAskPrice: '0.81',
        lastPrice: '0.9',
      });

      await waitFor(() => expect(drakeLine()).not.toBe(beforeQuote));
    });

    it('offers 1D, 1W, 1M and ALL and refetches every line per range', async () => {
      const view = await renderTopMarkets();

      expect(
        (['1D', '1W', '1M', 'ALL'] as const).map((range) =>
          view.getByTestId(PredictMarketHistoryTestIds.range(range)),
        ),
      ).toHaveLength(4);
      expect(
        view.queryByTestId(PredictMarketHistoryTestIds.range('LIVE')),
      ).not.toBeOnTheScreen();

      fireEvent.press(
        view.getByTestId(PredictMarketHistoryTestIds.range('1W')),
      );

      await waitFor(() =>
        TOP_MARKET_IDS.forEach((marketId) =>
          expect(getHistoryCalls(marketId, '1W')).toHaveLength(1),
        ),
      );
    });

    it('retries every line after a history error', async () => {
      let ellaAttempts = 0;
      mockPredictNextMessenger(
        (action: string, _venueId: string, id: string, range?: string) => {
          if (action === 'PredictMarketDataService:getEvent') {
            return Promise.resolve(createTopMarketsEvent());
          }
          if (action === 'PredictMarketDataService:getMarketHistory') {
            if (id === 'ella') {
              ellaAttempts += 1;
              if (ellaAttempts === 1) {
                return Promise.reject(new Error('unsafe history detail'));
              }
            }
            return Promise.resolve(createHistory(id, range));
          }
          return action.startsWith('PredictPortfolioService:getPositions')
            ? Promise.resolve({ venueId, positions: [] })
            : Promise.resolve(undefined);
        },
      );
      const view = renderPredictEventScreen(routeParams);
      const error = await view.findByTestId(PredictMarketHistoryTestIds.ERROR);
      const drakeCallsBeforeRetry = getHistoryCalls('drake').length;

      fireEvent.press(
        within(error).getByTestId(PredictMarketHistoryTestIds.RETRY),
      );

      expect(
        await view.findByTestId(PredictMarketHistoryTestIds.CHART),
      ).toBeOnTheScreen();
      expect(getHistoryCalls('drake').length).toBeGreaterThan(
        drakeCallsBeforeRetry,
      );
    });
  });

  it('selects a history range for a single-Market standard Event', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.range('ALL')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      (['1D', '1W', '1M', 'ALL'] as const).map((range) =>
        view.getByTestId(PredictMarketHistoryTestIds.range(range)),
      ),
    ).toHaveLength(4);
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.range('LIVE')),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.range('1Y')),
    ).not.toBeOnTheScreen();
    messengerCall.mockClear();
    fireEvent.press(view.getByTestId(PredictMarketHistoryTestIds.range('1W')));

    await waitFor(() =>
      expectMessengerCalledWith(
        'PredictMarketDataService:getMarketHistory',
        venueId,
        'market-1',
        '1W',
      ),
    );
    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
  });

  it('renders complete Market history after async load', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);

    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });

    await waitFor(() => {
      expect(chart.props.accessibilityLabel).toContain('Yes 42%');
      expect(chart.props.accessibilityLabel).toContain('No 58%');
    });
    expect(
      within(chart).getByTestId(PredictMarketHistoryTestIds.chartLabel('yes')),
    ).toBeOnTheScreen();
    expect(
      within(chart).getByTestId(PredictMarketHistoryTestIds.chartValue('yes')),
    ).toBeOnTheScreen();
    expect(
      within(chart).getByTestId(PredictMarketHistoryTestIds.chartLabel('no')),
    ).toBeOnTheScreen();
    expect(
      within(chart).getByTestId(PredictMarketHistoryTestIds.chartValue('no')),
    ).toBeOnTheScreen();
  });

  it('adds a chart entry for every live quote on the live range of a Game', async () => {
    const publishQuote = (lastPrice: string, updatedAt: string) =>
      act(() => {
        publishPredictNextQuoteUpdate({
          venueId,
          marketId: 'market-1' as PredictEntityId,
          outcomes: [
            {
              id: 'yes' as PredictEntityId,
              side: 'yes',
              bidPrice: '0.77' as PredictDecimal,
              askPrice: '0.88' as PredictDecimal,
            },
            {
              id: 'no' as PredictEntityId,
              side: 'no',
              bidPrice: '0.12' as PredictDecimal,
              askPrice: '0.23' as PredictDecimal,
            },
          ],
          lastPrice: lastPrice as PredictDecimal,
          updatedAt: updatedAt as PredictTimestamp,
        });
      });
    resolveEvent(createGameEvent());
    const view = renderPredictEventScreen(routeParams);
    const yesLinePath = () =>
      view.getByTestId(`${PredictMarketHistoryTestIds.CHART}-line-yes`).props
        .d as string;
    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    fireEvent.press(
      view.getByTestId(PredictMarketHistoryTestIds.range('LIVE')),
    );
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });
    await waitFor(() =>
      expect(
        view.getByTestId(PredictMarketHistoryTestIds.CHART).props
          .accessibilityLabel,
      ).toContain('Yes 42%'),
    );

    publishQuote('0.67', '2026-08-17T21:00:00.000Z');

    await waitFor(() => {
      expect(
        view.getByTestId(PredictMarketHistoryTestIds.CHART).props
          .accessibilityLabel,
      ).toContain('Yes 67%');
    });
    const afterFirstQuote = yesLinePath();

    publishQuote('0.77', '2026-08-17T22:00:00.000Z');

    await waitFor(() => {
      expect(
        view.getByTestId(PredictMarketHistoryTestIds.CHART).props
          .accessibilityLabel,
      ).toContain('Yes 77%');
    });
    // The second quote extends the line instead of moving its last point.
    expect(yesLinePath().length).toBeGreaterThan(afterFirstQuote.length);
    // The No line complements the yes-side last traded price.
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.CHART).props
        .accessibilityLabel,
    ).toContain('No 23%');
  });

  it('moves a standard Event line end to the last trade outside the live range', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 150 } },
    });
    await waitFor(() =>
      expect(
        view.getByTestId(PredictMarketHistoryTestIds.CHART).props
          .accessibilityLabel,
      ).toContain('Yes 42%'),
    );
    const beforeQuote = view.getByTestId(
      `${PredictMarketHistoryTestIds.CHART}-line-yes`,
    ).props.d as string;

    act(() => {
      publishPredictNextQuoteUpdate({
        venueId,
        marketId: 'market-1' as PredictEntityId,
        outcomes: [
          {
            id: 'yes' as PredictEntityId,
            side: 'yes',
            bidPrice: '0.77' as PredictDecimal,
            askPrice: '0.88' as PredictDecimal,
          },
          {
            id: 'no' as PredictEntityId,
            side: 'no',
            bidPrice: '0.12' as PredictDecimal,
            askPrice: '0.23' as PredictDecimal,
          },
        ],
        lastPrice: '0.67' as PredictDecimal,
        updatedAt: '2026-08-17T21:00:00.000Z' as PredictTimestamp,
      });
    });

    await waitFor(() =>
      expect(
        view.getByTestId(MarketStandardCardTestIds.yesButton('market-1')),
      ).toHaveTextContent(/88¢/),
    );
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.CHART).props
        .accessibilityLabel,
    ).toContain('Yes 67%, No 33%');
    expect(
      view.getByTestId(`${PredictMarketHistoryTestIds.CHART}-line-yes`).props.d,
    ).not.toBe(beforeQuote);
  });

  it('retries Market history after an initial error', async () => {
    let historyAttempts = 0;
    mockPredictNextMessenger(
      (action: string, _venueId: string, id: string, range?: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(createEvent());
        }
        if (action === 'PredictMarketDataService:getMarketHistory') {
          historyAttempts += 1;
          return historyAttempts === 1
            ? Promise.reject(new Error('unsafe history detail'))
            : Promise.resolve(createHistory(id, range));
        }
        return action.startsWith('PredictPortfolioService:getPositions')
          ? Promise.resolve({ venueId, positions: [] })
          : Promise.resolve(undefined);
      },
    );
    const view = renderPredictEventScreen(routeParams);
    const error = await view.findByTestId(PredictMarketHistoryTestIds.ERROR);

    fireEvent.press(
      within(error).getByTestId(PredictMarketHistoryTestIds.RETRY),
    );

    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.ERROR),
    ).not.toBeOnTheScreen();
  });

  it('shows an empty state when Market history has fewer than two points', async () => {
    mockPredictNextMessenger(
      (action: string, _venueId: string, id: string, range?: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(createEvent());
        }
        if (action === 'PredictMarketDataService:getMarketHistory') {
          return Promise.resolve(createHistory(id, range, 1));
        }
        return action.startsWith('PredictPortfolioService:getPositions')
          ? Promise.resolve({ venueId, positions: [] })
          : Promise.resolve(undefined);
      },
    );
    const view = renderPredictEventScreen(routeParams);

    const empty = await view.findByTestId(PredictMarketHistoryTestIds.EMPTY);

    expect(
      within(empty).getByTestId(PredictMarketHistoryTestIds.EMPTY_MESSAGE),
    ).toHaveTextContent('Market history is not available for this range.');
    expect(StyleSheet.flatten(empty.props.style).height).toBe(150);
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.CHART),
    ).not.toBeOnTheScreen();
  });

  it('reserves the chart height while Market history loads', async () => {
    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(createEvent());
      }
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return new Promise(() => undefined);
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId, positions: [] });
      }
      return action.startsWith('PredictPortfolioService:getPositions')
        ? Promise.resolve({ venueId, positions: [] })
        : Promise.resolve(undefined);
    });
    const view = renderPredictEventScreen(routeParams);

    const loading = await view.findByTestId(
      PredictMarketHistoryTestIds.LOADING,
    );

    expect(StyleSheet.flatten(loading.props.style).height).toBe(150);
  });

  it('keeps cached Market history visible when a refetch fails', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    const historyCallsBeforeRefetch = messengerCall.mock.calls.filter(
      ([action]) => action === 'PredictMarketDataService:getMarketHistory',
    ).length;
    mockPredictNextMessenger((action: string) => {
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return Promise.reject(new Error('Market history refetch failed'));
      }
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(createEvent());
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId, positions: [] });
      }
      return Promise.resolve(undefined);
    });

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(
        messengerCall.mock.calls.filter(
          ([action]) => action === 'PredictMarketDataService:getMarketHistory',
        ),
      ).toHaveLength(historyCallsBeforeRefetch + 1),
    );
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.ERROR),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.LOADING),
    ).not.toBeOnTheScreen();
  });

  it('plots each Team Market history as its own chart line', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    resolveEvent(event);
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 250 } },
    });

    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${awayMarket.outcomes[0].id}`,
      ).props.stroke.payload,
    ).toEqual(processColor(awayTeamColor));
    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${homeMarket.outcomes[0].id}`,
      ).props.stroke.payload,
    ).toEqual(processColor(homeTeamColor));
    // The API serves complementary series per market; each line ends at its
    // own market's latest point.
    expect(
      view.getByLabelText(/Panthers 42%, Cardinals 42%/),
    ).toBeOnTheScreen();
    expect(messengerCall.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          'PredictMarketDataService:getMarketHistory',
          venueId,
          awayMarket.id,
          'ALL',
        ]),
        expect.arrayContaining([
          'PredictMarketDataService:getMarketHistory',
          venueId,
          homeMarket.id,
          'ALL',
        ]),
      ]),
    );
  });

  it('plots a Team history from the Outcome that carries Game Selection', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    resolveEvent({
      ...event,
      markets: [
        {
          ...awayMarket,
          outcomes: [
            { ...awayMarket.outcomes[0], gameSelection: undefined },
            { ...awayMarket.outcomes[1], gameSelection: 'away' as const },
          ],
        },
        homeMarket,
      ],
    });
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 250 } },
    });

    expect(
      view.getByLabelText(/Panthers 42%, Cardinals 58%/),
    ).toBeOnTheScreen();
  });

  it('plots both Team lines when Game Selections share one Market', async () => {
    const { event, homeMarket } = createGameEventWithTeamMarkets();
    const sharedMarket = {
      ...homeMarket,
      id: 'moneyline' as PredictEntityId,
      outcomes: [
        {
          ...homeMarket.outcomes[0],
          id: 'home-yes' as PredictEntityId,
          gameSelection: 'home' as const,
        },
        {
          ...homeMarket.outcomes[1],
          id: 'away-no' as PredictEntityId,
          side: 'no' as const,
          gameSelection: 'away' as const,
        },
      ] as typeof homeMarket.outcomes,
    };
    resolveEvent({ ...event, markets: [sharedMarket] });
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 250 } },
    });

    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${sharedMarket.outcomes[0].id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${sharedMarket.outcomes[1].id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByLabelText(/Panthers 42%, Cardinals 58%/),
    ).toBeOnTheScreen();
  });

  it('omits a Team chart line whose history has fewer than two points', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    mockPredictNextMessenger(
      (action: string, _venueId: string, id: string, range?: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(event);
        }
        if (action === 'PredictMarketDataService:getMarketHistory') {
          return Promise.resolve(
            createHistory(id, range, id === homeMarket.id ? 1 : 2),
          );
        }
        return action.startsWith('PredictPortfolioService:getPositions')
          ? Promise.resolve({ venueId, positions: [] })
          : Promise.resolve(undefined);
      },
    );
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 250 } },
    });

    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${awayMarket.outcomes[0].id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${homeMarket.outcomes[0].id}`,
      ),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.EMPTY),
    ).not.toBeOnTheScreen();
  });

  it('lists winner and non-winner Markets under Game lines', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    const totalMarket = {
      ...awayMarket,
      id: 'total-market' as PredictEntityId,
      outcomes: [
        {
          ...awayMarket.outcomes[0],
          id: 'total-yes' as PredictEntityId,
          label: 'Over',
          askPrice: '0.55' as PredictDecimal,
          gameSelection: undefined,
        },
        {
          ...awayMarket.outcomes[1],
          id: 'total-no' as PredictEntityId,
          label: 'Under',
        },
      ] as typeof awayMarket.outcomes,
    };
    resolveEvent({
      ...event,
      markets: [awayMarket, homeMarket, totalMarket],
    });
    const view = renderPredictEventScreen(routeParams);

    expect(
      within(
        await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
      ).getAllByText(strings('predict_next.event.game_lines'))[0],
    ).toBeOnTheScreen();
    for (const marketId of ['away-market', 'home-market', 'total-market']) {
      expect(
        view.getByTestId(MarketStandardCardTestIds.card(marketId)),
      ).toBeOnTheScreen();
    }
    expect(view.getByText('Over')).toBeOnTheScreen();
  });

  it('opens the Order flow from a Team control and keeps dual-line history', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    resolveEvent(event);
    const view = renderPredictEventScreen(routeParams);
    const chart = await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    fireEvent(chart, 'layout', {
      nativeEvent: { layout: { width: 343, height: 250 } },
    });
    await view.findByTestId(
      `${PredictMarketHistoryTestIds.CHART}-line-${awayMarket.outcomes[0].id}`,
    );

    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.yesButton('away-market')),
    );

    expect(
      await view.findByTestId(PredictOrderFlowTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      within(view.getByTestId(PredictOrderFlowTestIds.SHEET)).getByText(
        awayMarket.outcomes[0].label,
      ),
    ).toBeOnTheScreen();

    // The chart never rotates to the selected Team; both team lines stay.
    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${awayMarket.outcomes[0].id}`,
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(
        `${PredictMarketHistoryTestIds.CHART}-line-${homeMarket.outcomes[0].id}`,
      ),
    ).toBeOnTheScreen();
  });

  it('lists winner Markets beside grouped spreads that also carry Game Selection', async () => {
    const { event, awayMarket, homeMarket } = createGameEventWithTeamMarkets();
    const spreadMarket = {
      ...awayMarket,
      id: 'spread-away' as PredictEntityId,
      group: {
        key: 'spread-1',
        groupType: 'marketSelector' as const,
        marketType: 'spread',
        option: { type: 'number' as const, value: 3.5 },
      },
      outcomes: [
        {
          ...awayMarket.outcomes[0],
          id: 'spread-away-yes' as PredictEntityId,
          label: 'ARI +3.5',
          gameSelection: 'away' as const,
        },
        { ...awayMarket.outcomes[1], id: 'spread-away-no' as PredictEntityId },
      ] as typeof awayMarket.outcomes,
    };
    resolveEvent({
      ...event,
      markets: [awayMarket, homeMarket, spreadMarket],
    });
    const view = renderPredictEventScreen(routeParams);

    expect(
      await view.findByTestId(MarketStandardCardTestIds.card('away-market')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketStandardCardTestIds.card('home-market')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('spread-1')),
    ).toBeOnTheScreen();
  });

  it('uses the Game header for a basketball Game', async () => {
    resolveEvent(
      createEvent({
        title: 'Lakers vs Celtics',
        sports: {
          sport: {
            id: 'basketball' as PredictEntityId,
            label: 'Basketball',
          },
          game: {
            status: 'in_progress',
            awayTeam: {
              name: 'Lakers',
              abbreviation: 'LAL',
              logoUrl: 'https://example.com/lal.png' as PredictHttpsUrl,
            },
            homeTeam: {
              name: 'Celtics',
              abbreviation: 'BOS',
              logoUrl: 'https://example.com/bos.png' as PredictHttpsUrl,
            },
            score: { away: '88', home: '91' },
            observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
          },
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      view.queryByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
    ).not.toBeOnTheScreen();
    expect(view.getByTestId(PredictEventScreenTestIds.TITLE)).toHaveTextContent(
      'Lakers vs Celtics',
    );
    expect(view.getByTestId(PredictEventScreenTestIds.TITLE)).toHaveProp(
      'numberOfLines',
      1,
    );
    expect(view.getByTestId(PredictEventScreenTestIds.BACK)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.IMAGE),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.CATEGORY),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamAbbreviation('home'),
      ),
    ).toHaveTextContent('BOS');
    expect(within(header).queryByText('Celtics')).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.LIVE_DOT),
    ).toBeOnTheScreen();
  });

  it('renders complete Market data in backend order', async () => {
    resolveEvent(createMultiMarketEvent());
    const view = renderPredictEventScreen(routeParams);

    expect(
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
    ).toBeOnTheScreen();
    const list = within(view.getByTestId(EventMarketListTestIds.ROOT));
    const titles = list.getAllByTestId(MarketStandardCardTestIds.TITLE_PATTERN);
    expect(titles.map(({ props }) => props.children)).toEqual([
      'Dodgers',
      'Yankees',
      'Field',
    ]);

    const dodgersCard = within(
      view.getByTestId(MarketStandardCardTestIds.card('dodgers')),
    );
    expect(dodgersCard.getByText('Yes')).toBeOnTheScreen();
    expect(
      within(
        view.getByTestId(MarketStandardCardTestIds.yesButton('dodgers')),
      ).getByText('38¢'),
    ).toBeOnTheScreen();
    expect(dodgersCard.getByText('No')).toBeOnTheScreen();
    expect(
      within(
        view.getByTestId(MarketStandardCardTestIds.noButton('dodgers')),
      ).getByText('62¢'),
    ).toBeOnTheScreen();

    const fieldCard = within(
      view.getByTestId(MarketStandardCardTestIds.card('field')),
    );
    expect(
      within(
        view.getByTestId(MarketStandardCardTestIds.yesButton('field')),
      ).getByText('0¢'),
    ).toBeOnTheScreen();
    expect(
      within(
        view.getByTestId(MarketStandardCardTestIds.noButton('field')),
      ).getByText('—'),
    ).toBeOnTheScreen();
    expect(fieldCard.getByText('No')).toBeOnTheScreen();
  });

  it('lists winner, total, and spread cards in one Game Event', async () => {
    resolveEventForRoute(makePredictNextCompositeGameEvent());
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );
    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);

    expect(
      view.getByTestId(
        MarketStandardCardTestIds.card('nfl-composite-away-market'),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(
        MarketStandardCardTestIds.card('nfl-composite-home-market'),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-total-points')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(MarketGroupCardTestIds.card('nfl-spreads')),
    ).toBeOnTheScreen();
  });

  it('loads ungrouped winner history when grouped Markets come first', async () => {
    const event = makePredictNextCompositeGameEvent();
    const groupedMarkets = event.markets.filter(
      (market) => market.group !== undefined,
    );
    const winnerMarkets = event.markets.filter(
      (market) => market.group === undefined,
    );
    resolveEventForRoute({
      ...event,
      markets: [...groupedMarkets, ...winnerMarkets],
    });

    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    expect(messengerCall.mock.calls).toEqual(
      expect.arrayContaining([
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          'nfl-composite-away-market',
          'ALL',
        ],
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          'nfl-composite-home-market',
          'ALL',
        ],
      ]),
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'nfl-spread-new-england-2-5',
      'ALL',
    );
  });

  it('loads Game history from the full-game choice group when period moneylines come first', async () => {
    resolveEventForRoute(makePredictNextLaidOutGameEvent());

    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(PredictMarketHistoryTestIds.CHART);

    expect(messengerCall.mock.calls).toEqual(
      expect.arrayContaining([
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          'nfl-composite-away-market',
          'ALL',
        ],
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          'nfl-composite-home-market',
          'ALL',
        ],
      ]),
    );
    const requestedMarketIds = messengerCall.mock.calls
      .filter(
        ([action]) => action === 'PredictMarketDataService:getMarketHistory',
      )
      .map(([, , marketId]) => marketId);
    expect(requestedMarketIds).not.toContain('nfl-composite-1h-away');
    expect(requestedMarketIds).not.toContain('nfl-composite-1h-home');
  });

  it('keeps winner Market history when a grouped Game line is selected', async () => {
    resolveEventForRoute(makePredictNextCompositeGameEvent());
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
      ),
    );

    await waitFor(() =>
      expect(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
        ),
      ).toHaveProp('accessibilityState', { selected: true }),
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'nfl-total-220-5',
      'ALL',
    );
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
  });

  it('keeps the default grouped history when a Game has no winner pair', async () => {
    const event = makePredictNextCompositeGameEvent();
    resolveEventForRoute({
      ...event,
      markets: event.markets.filter(
        (market) => market.group?.key === 'nfl-total-points',
      ),
    });
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
      ),
    );

    await waitFor(() =>
      expect(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
        ),
      ).toHaveProp('accessibilityState', { selected: true }),
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'nfl-total-220-5',
      'ALL',
    );
  });

  it('renders a Total group and updates prices when the selected line changes', async () => {
    const event = makePredictNextTotalsEvent();
    resolveEventForRoute(event);
    const view = renderPredictEventScreen(routeParams);

    const card = await view.findByTestId(
      MarketGroupCardTestIds.card('nfl-total-points'),
    );
    const getOutcomeButton = (marketId: string, side: 'yes' | 'no') =>
      within(card).getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          marketId,
          side,
        ),
      );
    const selectedOption = view.getByTestId(
      MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-218-5'),
    );

    expect(selectedOption).toHaveProp('accessibilityState', {
      selected: true,
    });
    expect(
      view.getByTestId(
        MarketGroupCardTestIds.selectionMarker('nfl-total-points'),
      ),
    ).toBeOnTheScreen();
    expect(getOutcomeButton('nfl-total-218-5', 'yes')).toHaveTextContent('12¢');
    expect(getOutcomeButton('nfl-total-218-5', 'no')).toHaveTextContent('88¢');

    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
      ),
    );

    await waitFor(() => {
      expect(getOutcomeButton('nfl-total-220-5', 'yes')).toHaveTextContent(
        '7¢',
      );
      expect(getOutcomeButton('nfl-total-220-5', 'no')).toHaveTextContent(
        '93¢',
      );
      expect(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-218-5'),
        ),
      ).toHaveProp('accessibilityState', { selected: false });
      expect(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
        ),
      ).toHaveProp('accessibilityState', { selected: true });
    });
    expect(
      within(card).queryByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          'nfl-total-218-5',
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();
    expect(
      within(card).getByTestId(
        MarketGroupCardTestIds.title('nfl-total-points'),
      ),
    ).toHaveTextContent('Total points');
  });

  it('names a threshold line in the Order flow by its card and line', async () => {
    const event = makePredictNextPlayerPropsEvent();
    resolveEventForRoute(event);
    const view = renderPredictEventScreen(routeParams);
    const groupKey = `${event.id}:rushing_yards:Rhamondre Stevenson`;
    const marketId = `${event.id}-rushing_yards-Rhamondre Stevenson-40`;

    fireEvent.press(
      await view.findByTestId(EventMarketListTestIds.layoutTab('player_props')),
    );
    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.outcomeButton(groupKey, marketId, 'no'),
      ),
    );

    expect(
      await view.findByTestId(PredictOrderFlowTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictOrderFlowTestIds.OUTCOME_LABEL),
    ).toHaveTextContent(/^No · Rhamondre Stevenson · 40\+/);
  });

  it('does not reload history when a grouped non-Game line is selected', async () => {
    const event = makePredictNextTotalsEvent();
    resolveEventForRoute(event);
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(MarketGroupCardTestIds.card('nfl-total-points'));
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(
        MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
      ),
    );

    await waitFor(() =>
      expect(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', 'nfl-total-220-5'),
        ),
      ).toHaveProp('accessibilityState', { selected: true }),
    );
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'nfl-total-220-5',
      'ALL',
    );
  });

  it('renders a grouped Market without a selector when it has one option', async () => {
    const event = makePredictNextTotalsEvent();
    const [market] = event.markets;
    resolveEventForRoute({
      ...event,
      markets: [market],
    });
    const view = renderPredictEventScreen(routeParams);

    const card = await view.findByTestId(
      MarketGroupCardTestIds.card('nfl-total-points'),
    );

    expect(card).toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketGroupCardTestIds.selector('nfl-total-points')),
    ).not.toBeOnTheScreen();
  });

  it('uses backend spread order during horizontal selection', async () => {
    const event = makePredictNextSpreadsEvent();
    resolveEventForRoute({
      ...event,
      markets: [...event.markets].reverse(),
    });
    const view = renderPredictEventScreen(routeParams);

    const card = await view.findByTestId(
      MarketGroupCardTestIds.card('nfl-spreads'),
    );
    const getOption = (marketId: string) =>
      view.getByTestId(MarketGroupCardTestIds.option('nfl-spreads', marketId));
    const getOutcomeButton = (marketId: string, side: 'yes' | 'no') =>
      within(card).getByTestId(
        MarketGroupCardTestIds.outcomeButton('nfl-spreads', marketId, side),
      );
    const getRow = (marketId: string, side: 'yes' | 'no') =>
      within(card).getByTestId(
        MarketGroupCardTestIds.row('nfl-spreads', marketId, side),
      );
    const selector = view.getByTestId(
      MarketGroupCardTestIds.selector('nfl-spreads'),
    );

    expect(
      within(card).getByTestId(MarketGroupCardTestIds.title('nfl-spreads')),
    ).toHaveTextContent('Spreads');
    expect(getOutcomeButton('nfl-spread-new-england-2-5', 'yes')).toBeEnabled();
    expect(getRow('nfl-spread-new-england-2-5', 'yes')).toHaveTextContent(
      /-2\.5/,
    );
    expect(getRow('nfl-spread-new-england-2-5', 'no')).toHaveTextContent(
      /\+2\.5/,
    );
    expect(getOutcomeButton('nfl-spread-new-england-2-5', 'no')).toBeEnabled();
    expect(
      getOutcomeButton('nfl-spread-new-england-2-5', 'yes').props
        .accessibilityLabel,
    ).toBe('New England, line -2.5, price 46¢');
    expect(getOption('nfl-spread-new-england-2-5')).toHaveTextContent('2.5');
    expect(
      getOption('nfl-spread-new-england-2-5').props.accessibilityLabel,
    ).toBe('Market option for New England, line 2.5, price 46¢');
    expect(getOption('nfl-spread-new-england-2-5')).toHaveProp(
      'accessibilityState',
      { selected: true },
    );
    expect(getOption('nfl-spread-new-england-1-5')).toHaveTextContent('1.5');
    expect(getOption('nfl-spread-new-england-1-5')).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
    expect(getOption('nfl-spread-seattle-1-5')).toHaveTextContent('1.5');
    expect(getOption('nfl-spread-seattle-1-5')).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
    expect(getOption('nfl-spread-seattle-2-5')).toHaveTextContent('2.5');
    expect(getOption('nfl-spread-seattle-2-5')).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
    expect(
      within(selector).getAllByTestId(
        /^predict-next-market-group-nfl-spreads-option-/,
      ),
    ).toHaveLength(4);
    expect(
      within(selector)
        .getAllByTestId(/^predict-next-market-group-nfl-spreads-option-/)
        .map((option) => option.props.testID),
    ).toEqual([
      MarketGroupCardTestIds.option(
        'nfl-spreads',
        'nfl-spread-new-england-2-5',
      ),
      MarketGroupCardTestIds.option(
        'nfl-spreads',
        'nfl-spread-new-england-1-5',
      ),
      MarketGroupCardTestIds.option('nfl-spreads', 'nfl-spread-seattle-1-5'),
      MarketGroupCardTestIds.option('nfl-spreads', 'nfl-spread-seattle-2-5'),
    ]);
    act(() => {
      selector.props.onLayout({
        nativeEvent: { layout: { width: 300 } },
      });
      selector.props.onScrollEndDrag?.(createScrollEvent(168));
    });
    await waitFor(() => {
      expect(getOption('nfl-spread-seattle-2-5')).toHaveProp(
        'accessibilityState',
        { selected: true },
      );
      expect(getRow('nfl-spread-seattle-2-5', 'yes')).toHaveTextContent(
        /\+2\.5/,
      );
      expect(getRow('nfl-spread-seattle-2-5', 'no')).toHaveTextContent(/-2\.5/);
    });
    expect(getOption('nfl-spread-seattle-1-5')).toHaveProp(
      'accessibilityState',
      { selected: false },
    );
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.row(
          'nfl-spreads',
          'nfl-spread-new-england-2-5',
          'yes',
        ),
      ),
    ).not.toBeOnTheScreen();
  });

  it('distinguishes zero prices from missing grouped prices', async () => {
    const event = makePredictNextTotalsEvent();
    const [market] = event.markets;
    if (market === undefined) {
      throw new Error('Expected a grouped Market.');
    }
    const modifiedMarket = {
      ...market,
      outcomes: [
        { ...market.outcomes[0], askPrice: '0' as PredictDecimal },
        { ...market.outcomes[1], askPrice: undefined },
      ] as typeof market.outcomes,
    };
    resolveEventForRoute({ ...event, markets: [modifiedMarket] });
    const view = renderPredictEventScreen(routeParams);

    const card = await view.findByTestId(
      MarketGroupCardTestIds.card('nfl-total-points'),
    );
    const yesButton = within(card).getByTestId(
      MarketGroupCardTestIds.outcomeButton(
        'nfl-total-points',
        market.id,
        'yes',
      ),
    );

    expect(yesButton).toHaveTextContent('0¢');
    expect(
      view.getByTestId(
        MarketGroupCardTestIds.quoteBar('nfl-total-points', market.id, 'yes'),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        MarketGroupCardTestIds.quoteBar('nfl-total-points', market.id, 'no'),
      ),
    ).not.toBeOnTheScreen();
    expect(
      within(card).getByTestId(
        MarketGroupCardTestIds.outcomeButton(
          'nfl-total-points',
          market.id,
          'no',
        ),
      ),
    ).toHaveTextContent('—');
  });

  it('opens the shared rules sheet with Event and selected Market rules', async () => {
    const event = createMultiMarketEvent();
    resolveEvent({
      ...event,
      rules: 'Event rule.',
      settlementSources: [
        {
          name: 'the Governing League',
          url: 'https://www.nfl.com/' as PredictHttpsUrl,
        },
        { name: 'ESPN', url: 'https://www.espn.com/' as PredictHttpsUrl },
      ],
      markets: event.markets.map((market) =>
        market.id === 'dodgers' || market.id === 'yankees'
          ? { ...market, rules: 'Market rule for the selected market.' }
          : market,
      ),
    });
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.title('dodgers')),
    );

    expect(
      await view.findByTestId(RulesBottomSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(view.getByText('Event rule.')).toBeOnTheScreen();
    expect(
      view.getByText('Market rule for the selected market.'),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(RulesBottomSheetTestIds.MARKET_QUESTION),
    ).toHaveTextContent('Will Dodgers win?');
    expect(view.getByTestId(RulesBottomSheetTestIds.SOURCES)).toHaveTextContent(
      'Outcome verified from the Governing League and ESPN.',
    );
  });

  it('opens the Event rules from the Event header', async () => {
    resolveEvent(createEvent({ rules: 'Event-only rule.' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );
    fireEvent.press(
      within(header).getByTestId(PredictEventScreenTestIds.EVENT_RULES_BUTTON),
    );

    expect(
      await view.findByTestId(RulesBottomSheetTestIds.SHEET),
    ).toBeOnTheScreen();
    expect(view.getByText('Event-only rule.')).toBeOnTheScreen();
    expect(
      view.queryByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).not.toBeOnTheScreen();
  });

  it('omits duplicate Market rules when Event and Market content matches', async () => {
    const event = createMultiMarketEvent();
    resolveEvent({
      ...event,
      rules: 'Shared rule.',
      markets: event.markets.map((market) =>
        market.id === 'dodgers'
          ? { ...market, rules: ' Shared rule. ' }
          : market,
      ),
    });
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.title('dodgers')),
    );

    expect(
      await view.findByTestId(RulesBottomSheetTestIds.EVENT_RULES),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(RulesBottomSheetTestIds.MARKET_RULES),
    ).not.toBeOnTheScreen();
  });

  it('opens Market-only rules without an Event rules section', async () => {
    const event = createMultiMarketEvent();
    resolveEvent({
      ...event,
      markets: event.markets.map((market) =>
        market.id === 'dodgers'
          ? { ...market, rules: 'Market-only rule.' }
          : market,
      ),
    });
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.title('dodgers')),
    );

    await view.findByTestId(RulesBottomSheetTestIds.MARKET_RULES);
    expect(view.getByText('Market-only rule.')).toBeOnTheScreen();
    expect(
      view.queryByTestId(RulesBottomSheetTestIds.EVENT_RULES),
    ).not.toBeOnTheScreen();
  });

  it('omits rules controls when Event and Market rules are absent', async () => {
    resolveEvent(createMultiMarketEvent());
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);

    expect(
      view.queryByTestId(PredictEventScreenTestIds.EVENT_RULES_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      view.getByTestId(MarketStandardCardTestIds.title('dodgers')),
    ).not.toHaveProp('accessibilityRole', 'button');
    expect(
      view.queryByTestId(RulesBottomSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('keeps Outcome presses inside the Event Screen', async () => {
    resolveEvent(createMultiMarketEvent());
    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(EventMarketListTestIds.MARKETS_TAB);
    const serviceCallCount = messengerCall.mock.calls.length;

    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.yesButton('dodgers')),
    );
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.noButton('dodgers')),
    );

    expect(view.getByTestId(PredictEventScreenTestIds.VIEW)).toBeOnTheScreen();
    // Opening the Order Flow reads the Venue catalog (to admit the action),
    // venue Balance, and Venue Status (cached across the two opens); pressing
    // Outcomes must not leave the Event Screen or request anything else from
    // the services.
    const newCalls = messengerCall.mock.calls.slice(serviceCallCount);
    expect(newCalls.length).toBeGreaterThan(0);
    for (const [action] of newCalls) {
      expect([
        'PredictMarketDataService:getVenueCatalog',
        'PredictPortfolioService:getBalance',
        'PredictMarketDataService:getVenueStatus',
      ]).toContain(action);
    }
  });

  it('uses the standard header for Sports metadata without a Game', async () => {
    resolveEvent(
      createEvent({
        sports: {
          sport: {
            id: 'american-football' as PredictEntityId,
            label: 'American football',
          },
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      view.queryByTestId(PredictEventScreenTestIds.GAME_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('renders a scheduled Game without inventing a score', async () => {
    resolveEvent(
      createGameEvent({
        status: 'scheduled',
        score: undefined,
        period: undefined,
        clock: undefined,
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('SCHEDULED');
    expect(
      within(header).queryByTestId(
        PredictEventScreenTestIds.teamScore('away'),
        HIDDEN,
      ),
    ).not.toBeOnTheScreen();
    expect(
      within(header).queryByTestId(PredictEventScreenTestIds.LIVE_DOT),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamAbbreviation('home'),
      ),
    ).toHaveTextContent('CAR');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toBeOnTheScreen();
  });

  it('shows the abbreviation when a Team has no logo', async () => {
    resolveEvent(createGameEvent());
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamLogoFallback('home'),
        HIDDEN,
      ),
    ).toHaveTextContent('CAR');
    expect(
      within(header).queryByTestId(PredictEventScreenTestIds.teamLogo('home'), {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('faces both 40px helmets toward the centre from their logo facing', async () => {
    resolveEvent(
      createGameEvent({
        awayTeam: {
          name: 'Arizona Cardinals',
          abbreviation: 'ARI',
          logoUrl: headerAwayLogoUrl,
          logoFacing: 'left',
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          logoUrl: headerHomeLogoUrl,
          logoFacing: 'left',
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );
    const awayLogo = within(header).getByTestId(
      PredictEventScreenTestIds.teamLogo('away'),
      HIDDEN,
    );
    const homeLogo = within(header).getByTestId(
      PredictEventScreenTestIds.teamLogo('home'),
      HIDDEN,
    );

    expect(
      within(header)
        .getAllByTestId(/^predict-next-event-team-(away|home)$/)
        .map((team) => team.props.testID),
    ).toEqual([
      PredictEventScreenTestIds.team('away'),
      PredictEventScreenTestIds.team('home'),
    ]);
    // Left-facing helmets: only the left slot (away) is mirrored.
    expect(awayLogo).toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(homeLogo).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(awayLogo).toHaveStyle({ width: 40, height: 40 });
    expect(homeLogo).toHaveStyle({ width: 40, height: 40 });
  });

  it('renders the observed score, period, and clock for an in-progress Game', async () => {
    resolveEvent(
      createGameEvent({
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          primaryColor: homeTeamColor,
          logoUrl: 'https://example.com/car.png' as NonNullable<
            NonNullable<
              NonNullable<PredictEvent['sports']>['game']
            >['homeTeam']['logoUrl']
          >,
          logoFacing: 'right',
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamAbbreviation('away'),
      ),
    ).toHaveTextContent('ARI');
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamAbbreviation('home'),
      ),
    ).toHaveTextContent('CAR');
    expect(
      within(header).queryByText('Arizona Cardinals'),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.LIVE_DOT),
    ).toBeOnTheScreen();
    expect(
      within(header).queryByTestId(PredictEventScreenTestIds.teamScore('away')),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamScore('away'),
        HIDDEN,
      ),
    ).toHaveTextContent('17');
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamScore('home'),
        HIDDEN,
      ),
    ).toHaveTextContent('21');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('LIVE');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toHaveTextContent('Q4 · 12:22');
  });

  it('lists the home Team first in the header of a home_first Game', async () => {
    resolveEvent(
      createGameEvent({
        teamOrder: 'home_first',
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          logoUrl: headerHomeLogoUrl,
          logoFacing: 'right',
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header)
        .getAllByTestId(/^predict-next-event-team-(away|home)$/)
        .map((team) => team.props.testID),
    ).toEqual([
      PredictEventScreenTestIds.team('home'),
      PredictEventScreenTestIds.team('away'),
    ]);
    // Right-facing helmets: the right slot (away) is mirrored.
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamLogo('home'), {
        includeHiddenElements: true,
      }),
    ).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamLogo('away'), {
        includeHiddenElements: true,
      }),
    ).toHaveStyle({ transform: [{ scaleX: -1 }] });
  });

  it('never mirrors a header logo without a facing', async () => {
    resolveEvent(
      createGameEvent({
        awayTeam: {
          name: 'Arizona Cardinals',
          abbreviation: 'ARI',
          logoUrl: headerAwayLogoUrl,
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          logoUrl: headerHomeLogoUrl,
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamLogo('away'), {
        includeHiddenElements: true,
      }),
    ).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamLogo('home'), {
        includeHiddenElements: true,
      }),
    ).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
  });

  it('shows an unmirrored abbreviation when a mirrored header logo fails to load', async () => {
    resolveEvent(
      createGameEvent({
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          logoUrl: headerHomeLogoUrl,
          logoFacing: 'right',
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);
    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    fireEvent(
      within(header).getByTestId(PredictEventScreenTestIds.teamLogo('home'), {
        includeHiddenElements: true,
      }),
      'error',
    );

    const fallback = within(header).getByTestId(
      PredictEventScreenTestIds.teamLogoFallback('home'),
      { includeHiddenElements: true },
    );
    expect(fallback).toHaveTextContent('CAR');
    expect(fallback).not.toHaveStyle({ transform: [{ scaleX: -1 }] });
    expect(
      within(header).queryByTestId(PredictEventScreenTestIds.teamLogo('home'), {
        includeHiddenElements: true,
      }),
    ).not.toBeOnTheScreen();
  });

  it('applies live Game updates to the Event header', async () => {
    resolveEvent(createGameEvent({ status: 'scheduled', score: undefined }));
    const view = renderPredictEventScreen(routeParams);
    const scheduledHeader = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );
    expect(
      within(scheduledHeader).queryByTestId(PredictEventScreenTestIds.LIVE_DOT),
    ).not.toBeOnTheScreen();

    act(() => {
      publishPredictNextGameLiveUpdate({
        venueId,
        eventId,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '28', home: '24' },
        period: 'Q4',
        clock: '01:12',
        observedAt: '2026-09-11T03:00:00.000Z' as PredictTimestamp,
      });
    });

    const header = view.getByTestId(PredictEventScreenTestIds.GAME_HEADER);
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamScore('away'),
        HIDDEN,
      ),
    ).toHaveTextContent('28');
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamScore('home'),
        HIDDEN,
      ),
    ).toHaveTextContent('24');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toHaveTextContent('Q4 · 01:12');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.LIVE_DOT),
    ).toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.team('away')),
    ).toHaveProp('accessibilityLabel', 'Arizona Cardinals, 28');
  });

  it('watches the Event for live updates and stops on unmount', async () => {
    resolveEvent(createGameEvent());
    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expectMessengerCalledWith('PredictLiveDataService:watchEvents', venueId, [
      eventId,
    ]);

    view.unmount();

    expectMessengerCalledWith('PredictLiveDataService:unwatchEvents', venueId, [
      eventId,
    ]);
  });

  it('renders a completed Game as final with its observed metadata', async () => {
    resolveEvent(createGameEvent({ status: 'completed' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('FINAL');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toHaveTextContent('Q4 · 12:22');
  });

  it('lays out the standard Event header without an image', async () => {
    resolveEvent(createEvent({ imageUrl: undefined, category: 'Politics' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      view.queryByTestId(PredictEventScreenTestIds.IMAGE),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.TITLE),
    ).toHaveTextContent('Canonical Event title');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.CATEGORY),
    ).toHaveTextContent('Politics');
  });

  it('hides the category line when the standard Event has none', async () => {
    resolveEvent(createEvent({ category: undefined }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      view.queryByTestId(PredictEventScreenTestIds.CATEGORY),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.TITLE),
    ).toHaveTextContent('Canonical Event title');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.IMAGE),
    ).toBeOnTheScreen();
  });

  it('hides the category line when the standard Event category is empty', async () => {
    resolveEvent(createEvent({ category: '' }));
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      view.queryByTestId(PredictEventScreenTestIds.CATEGORY),
    ).not.toBeOnTheScreen();
  });

  it('omits a standard Event image after it fails to load', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);
    const image = await view.findByTestId(PredictEventScreenTestIds.IMAGE);

    fireEvent(image, 'onError');

    expect(
      view.queryByTestId(PredictEventScreenTestIds.IMAGE),
    ).not.toBeOnTheScreen();
  });

  it('keeps full Team names in the Team labels', async () => {
    const awayName = 'The Extremely Long Arizona Cardinals Team Name';
    const homeName = 'The Extremely Long Carolina Panthers Team Name';
    resolveEvent(
      createGameEvent({
        awayTeam: { name: awayName },
        homeTeam: { name: homeName },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
      {},
      EVENT_LOAD,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.team('away')),
    ).toHaveProp('accessibilityLabel', `${awayName}, 17`);
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.team('home')),
    ).toHaveProp('accessibilityLabel', `${homeName}, 21`);
    expect(within(header).queryByText(awayName)).not.toBeOnTheScreen();
  });

  it('keeps blocking error context visible while a retry is in progress', async () => {
    messengerCall
      .mockRejectedValueOnce(new Error('unsafe transport detail'))
      .mockReturnValueOnce(new Promise(() => undefined));
    const view = renderPredictEventScreen(routeParams);
    const error = await view.findByTestId(PredictEventScreenTestIds.ERROR);

    fireEvent.press(within(error).getByTestId(PredictEventScreenTestIds.RETRY));

    await waitFor(() =>
      expect(view.getByTestId(PredictEventScreenTestIds.RETRY)).toBeDisabled(),
    );
    expect(view.getByTestId(PredictEventScreenTestIds.TITLE)).toHaveTextContent(
      routeParams.titleSnapshot,
    );
    expect(
      view.getByTestId(PredictEventScreenTestIds.ERROR_MESSAGE),
    ).toHaveTextContent('Unable to load this event.');
    expect(error).not.toHaveTextContent('unsafe transport detail');
    expect(
      view.queryByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
  });

  it('retries only the immutable Event query after a blocking error', async () => {
    messengerCall
      .mockRejectedValueOnce(new Error('unsafe transport detail'))
      .mockResolvedValueOnce(createEvent())
      // Account-scoped reads follow the Event retry; infinite queries must
      // resolve a valid page shape, never undefined.
      .mockImplementation((action: string) =>
        action.startsWith('PredictPortfolioService:getPositions')
          ? Promise.resolve({ venueId, positions: [] })
          : Promise.resolve(undefined),
      );
    const view = renderPredictEventScreen(routeParams);
    const error = await view.findByTestId(PredictEventScreenTestIds.ERROR);

    fireEvent.press(within(error).getByTestId(PredictEventScreenTestIds.RETRY));

    expect(
      await view.findByTestId(
        PredictEventScreenTestIds.STANDARD_HEADER,
        {},
        EVENT_LOAD,
      ),
    ).toBeOnTheScreen();
    const eventCalls = messengerCall.mock.calls.filter(
      ([action]) => action === 'PredictMarketDataService:getEvent',
    );
    expect(eventCalls).toHaveLength(2);
    eventCalls.forEach((call) => {
      expect(call.slice(0, 3)).toEqual([
        'PredictMarketDataService:getEvent',
        venueId,
        eventId,
      ]);
    });
    expectMessengerCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'market-1',
      'ALL',
    );
  });

  it('returns Home when the Event has no originating screen', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);
    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
      {},
      EVENT_LOAD,
    );

    fireEvent.press(within(header).getByTestId(PredictEventScreenTestIds.BACK));

    await waitFor(() =>
      expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen(),
    );
  });

  describe('live market scope', () => {
    const WATCH_EVENTS = 'PredictLiveDataService:watchEvents';
    const UNWATCH_EVENTS = 'PredictLiveDataService:unwatchEvents';
    const AWAY_WINNER = 'nfl-composite-away-market';
    const HOME_WINNER = 'nfl-composite-home-market';
    const FIRST_SPREAD = 'nfl-spread-new-england-2-5';
    const FIRST_TOTAL = 'nfl-total-218-5';
    const OTHER_TOTAL = 'nfl-total-220-5';
    const FIRST_HALF_MONEYLINE = [
      'nfl-composite-1h-away',
      'nfl-composite-1h-tie',
      'nfl-composite-1h-home',
    ];
    const PROP_SECTIONS = 25;
    const PROP_LINES = 10;

    /**
     * The laid-out Game plus a player-props tab of 250 threshold lines, so
     * the whole Event is past the 250-Market connection cap.
     */
    const createFullGame = (): PredictEvent => {
      const event = makePredictNextLaidOutGameEvent();
      const [template] = makePredictNextCompositeGameEvent().markets;
      const props = Array.from({ length: PROP_SECTIONS }, (_, section) =>
        Array.from({ length: PROP_LINES }, (__, line): PredictMarket => {
          const id = `prop-${section}-${line}`;
          return {
            ...template,
            id: id as PredictEntityId,
            question: `Player ${section}: ${line * 10}+`,
            outcomes: [
              {
                ...template.outcomes[0],
                id: `${id}-yes` as PredictEntityId,
                label: 'Yes',
              },
              {
                ...template.outcomes[1],
                id: `${id}-no` as PredictEntityId,
                label: 'No',
              },
            ],
            group: {
              key: `props:${section}`,
              groupType: 'marketSelector',
              marketType: 'threshold',
              option: { type: 'number', value: line * 10 },
              displayOrder: line,
              label: `Player ${section}`,
            },
            layout: {
              tab: { key: 'player_props', order: 1 },
              section: { key: `prop_section_${section}`, order: section },
            },
          };
        }),
      ).flat();
      return {
        ...event,
        venueId,
        id: eventId,
        markets: [...event.markets, ...props],
      };
    };

    /** `[watch | unwatch, visible Market ids]` for every live-data call. */
    const scopeCalls = (): [string, readonly string[]][] =>
      messengerCall.mock.calls
        .filter(
          ([action]) => action === WATCH_EVENTS || action === UNWATCH_EVENTS,
        )
        .map(([action, , , options]) => [
          action === WATCH_EVENTS ? 'watch' : 'unwatch',
          options.marketScope.marketIds,
        ]);
    const watchedMarketIds = () =>
      scopeCalls()
        .filter(([action]) => action === 'watch')
        .map(([, ids]) => ids)
        .at(-1);
    const sorted = (ids: readonly string[]) => [...ids].sort();
    const sectionOf = (
      view: ReturnType<typeof renderPredictEventScreen>,
      key: string,
    ) => within(view.getByTestId(EventMarketLayoutSectionTestIds.section(key)));

    const renderFullGame = async () => {
      const event = createFullGame();
      resolveEvent(event);
      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(MarketGroupCardTestIds.card('nfl-spreads'));
      await waitFor(() =>
        expect(watchedMarketIds()).toEqual(
          sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, FIRST_TOTAL]),
        ),
      );
      return { event, view };
    };

    /** The calls made since `from`, i.e. the last state change's re-scope. */
    const callsSince = (from: number) => scopeCalls().slice(from);

    it('watches the chart and the open sections, not the whole Game', async () => {
      const { event } = await renderFullGame();

      expect(event.markets.length).toBeGreaterThan(250);
      // Every watch the screen made named its Markets; none asked for all.
      scopeCalls().forEach(([, ids]) => {
        expect(ids.length).toBeLessThanOrEqual(4);
      });
      expect(
        messengerCall.mock.calls.filter(
          ([action, , , options]) =>
            action === WATCH_EVENTS && options?.marketScope === 'all',
        ),
      ).toEqual([]);
    });

    it('drops a closed section and restores it when it opens again', async () => {
      const { view } = await renderFullGame();
      const before = scopeCalls().length;

      fireEvent.press(
        sectionOf(view, 'spread').getByTestId(EventMarketSectionTestIds.HEADER),
      );
      await waitFor(() =>
        expect(callsSince(before)).toEqual([
          ['watch', sorted([AWAY_WINNER, HOME_WINNER, FIRST_TOTAL])],
          [
            'unwatch',
            sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, FIRST_TOTAL]),
          ],
        ]),
      );

      const closed = scopeCalls().length;
      fireEvent.press(
        sectionOf(view, 'spread').getByTestId(EventMarketSectionTestIds.HEADER),
      );
      await waitFor(() =>
        expect(callsSince(closed)).toEqual([
          [
            'watch',
            sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, FIRST_TOTAL]),
          ],
          ['unwatch', sorted([AWAY_WINNER, HOME_WINNER, FIRST_TOTAL])],
        ]),
      );
    });

    it('swaps the moneyline Markets for the selected period chip', async () => {
      const { view } = await renderFullGame();
      const before = scopeCalls().length;

      fireEvent.press(
        view.getByTestId(EventMarketPeriodChipsTestIds.CHIP('first_half')),
      );

      // The chart keeps the full-game winners live; the list now shows only
      // the first-half moneyline.
      await waitFor(() =>
        expect(callsSince(before)).toEqual([
          [
            'watch',
            sorted([
              AWAY_WINNER,
              HOME_WINNER,
              ...FIRST_HALF_MONEYLINE,
              FIRST_SPREAD,
              FIRST_TOTAL,
            ]),
          ],
          [
            'unwatch',
            sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, FIRST_TOTAL]),
          ],
        ]),
      );
    });

    it('follows the selected line of a line picker', async () => {
      const { view } = await renderFullGame();
      const before = scopeCalls().length;

      fireEvent.press(
        view.getByTestId(
          MarketGroupCardTestIds.option('nfl-total-points', OTHER_TOTAL),
        ),
      );

      await waitFor(() =>
        expect(callsSince(before)).toEqual([
          [
            'watch',
            sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, OTHER_TOTAL]),
          ],
          [
            'unwatch',
            sorted([AWAY_WINNER, HOME_WINNER, FIRST_SPREAD, FIRST_TOTAL]),
          ],
        ]),
      );
    });

    it('watches the selected tab only', async () => {
      const { view } = await renderFullGame();
      const before = scopeCalls().length;

      fireEvent.press(
        view.getByTestId(EventMarketListTestIds.layoutTab('player_props')),
      );

      // Three open prop sections, each pricing its first line.
      await waitFor(() =>
        expect(callsSince(before)[0]).toEqual([
          'watch',
          sorted([
            AWAY_WINNER,
            HOME_WINNER,
            'prop-0-0',
            'prop-1-0',
            'prop-2-0',
          ]),
        ]),
      );
    });

    it('does not re-scope when a live price re-renders the screen', async () => {
      const { event, view } = await renderFullGame();
      const before = scopeCalls().length;
      const total = event.markets.find((market) => market.id === FIRST_TOTAL);
      if (!total) {
        throw new Error(`No ${FIRST_TOTAL} in the fixture`);
      }
      const [yes, no] = total.outcomes;

      act(() => {
        publishPredictNextQuoteUpdate({
          venueId,
          marketId: total.id,
          outcomes: [
            { id: yes.id, side: yes.side, askPrice: '0.31' as PredictDecimal },
            { id: no.id, side: no.side, askPrice: '0.69' as PredictDecimal },
          ],
          updatedAt: '2026-09-11T03:00:00.000Z' as PredictTimestamp,
        });
      });

      await waitFor(() =>
        expect(
          view.getByTestId(
            MarketGroupCardTestIds.outcomeButton(
              'nfl-total-points',
              FIRST_TOTAL,
              'yes',
            ),
          ),
        ).toHaveTextContent('31¢'),
      );
      expect(callsSince(before)).toEqual([]);
    });

    it('does not re-scope on scroll while the tab is within the live budget', async () => {
      const { view } = await renderFullGame();
      const before = scopeCalls().length;

      await act(async () => {
        fireEvent(
          view.getByTestId(EventMarketListTestIds.ROOT),
          'onViewableItemsChanged',
          { viewableItems: [] },
        );
        fireEvent(
          view.getByTestId(EventMarketListTestIds.ROOT),
          'onViewableItemsChanged',
          {
            viewableItems: [
              {
                item: {
                  type: 'sectionHeader',
                  stateKey: 'unknown',
                },
              },
            ],
          },
        );
      });

      expect(callsSince(before)).toEqual([]);
    });
  });

  describe('live market scope past the connection cap', () => {
    const MARKET_COUNT = 260;
    const marketId = (index: number) => `market-${index}`;
    /** A flat Event of standard Markets, more than one connection holds. */
    const createLargeFlatEvent = (): PredictEvent =>
      createEvent({
        markets: Array.from({ length: MARKET_COUNT }, (_, index) => ({
          id: marketId(index) as PredictEntityId,
          question: `Market ${index}?`,
          status: 'active' as const,
          outcomes: [
            {
              id: `${marketId(index)}-yes` as PredictEntityId,
              side: 'yes' as const,
              label: 'Yes',
              // The chart charts the three highest asks: Markets 0 to 2.
              askPrice: (index < 3 ? '0.9' : '0.1') as PredictDecimal,
            },
            {
              id: `${marketId(index)}-no` as PredictEntityId,
              side: 'no' as const,
              label: 'No',
            },
          ],
        })),
      });
    const CHART_MARKETS = [0, 1, 2].map(marketId);

    /** The gateway side of the live-data socket: records subscribe frames. */
    class FakeGatewaySocket {
      static instances: FakeGatewaySocket[] = [];
      readyState = 0;
      onmessage: ((event: { data: string }) => void) | null = null;
      onclose: (() => void) | null = null;
      onerror: (() => void) | null = null;
      readonly sent: {
        type: 'subscribe' | 'unsubscribe';
        topic: string;
        markets?: string[];
      }[] = [];
      readonly url: string;
      constructor(url: string) {
        this.url = url;
        FakeGatewaySocket.instances.push(this);
      }
      send = (data: string) => {
        this.sent.push(JSON.parse(data));
      };
      close = () => {
        this.readyState = 3;
        this.onclose?.();
      };
      openAndWelcome() {
        this.readyState = 1;
        this.onmessage?.({
          data: JSON.stringify({ type: 'welcome', protocol: 1 }),
        });
      }
      /** Market ids the gateway holds, replaying every frame in order. */
      subscribedMarketIds(): string[] {
        const held = new Set<string>();
        this.sent
          .filter((frame) => frame.topic === 'market')
          .forEach((frame) =>
            frame.markets?.forEach((id) =>
              frame.type === 'subscribe' ? held.add(id) : held.delete(id),
            ),
          );
        return [...held].sort();
      }
    }

    const restores: (() => void)[] = [];
    afterEach(() => {
      restores.splice(0).forEach((restore) => restore());
      FakeGatewaySocket.instances = [];
    });

    /**
     * Routes the screen's live-data watches to a real PredictLiveDataService
     * and PredictLiveDataClient over a fake gateway socket, so the test reads
     * what reaches the wire rather than what the hook asked for.
     */
    const routeLiveDataToRealService = (event: PredictEvent) => {
      const messenger: PredictLiveDataServiceMessenger = new Messenger({
        namespace: PREDICT_LIVE_DATA_SERVICE_NAME,
      });
      const service = new PredictLiveDataService({
        messenger,
        venueId,
        resolveEvent: async () => event,
        createClient: ({ onGameUpdate, onQuoteUpdate }) =>
          new PredictLiveDataClient({
            baseUrl: 'https://predict.example/',
            getBearerToken: async () => 'test-bearer-token',
            WebSocket: FakeGatewaySocket as unknown as typeof WebSocket,
            AppState: {
              addEventListener: () => ({ remove: () => undefined }),
            } as unknown as PredictLiveDataClientOptions['AppState'],
            onGameUpdate,
            onQuoteUpdate,
          }),
      });
      const controllerMessenger = Engine.controllerMessenger as unknown as {
        call: (action: string, ...params: unknown[]) => unknown;
      };
      const originalCall = controllerMessenger.call;
      restores.push(() => {
        controllerMessenger.call = originalCall;
        service.destroy();
      });
      controllerMessenger.call = (action: string, ...params: unknown[]) =>
        action.startsWith(`${PREDICT_LIVE_DATA_SERVICE_NAME}:`)
          ? (
              messenger.call as unknown as (
                action: string,
                ...params: unknown[]
              ) => unknown
            )(action, ...params)
          : originalCall(action, ...params);
    };

    const range = (from: number, to: number) =>
      Array.from({ length: to - from + 1 }, (_, index) =>
        marketId(from + index),
      );
    const sorted = (ids: readonly string[]) => [...new Set(ids)].sort();

    it('keeps the list and chart within the default connection cap', () => {
      expect(EVENT_LIST_LIVE_MARKET_BUDGET + TOP_CHART_MARKET_LIMIT).toBe(
        PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION,
      );
    });

    it('moves the live set to a Market past the cap when it scrolls into view', async () => {
      const event = createLargeFlatEvent();
      resolveEventForRoute(event);
      routeLiveDataToRealService(event);
      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(EventMarketListTestIds.ROOT);
      await waitFor(() => expect(FakeGatewaySocket.instances).toHaveLength(1));
      const [socket] = FakeGatewaySocket.instances;
      act(() => socket.openAndWelcome());

      // Before any viewability report, the first rendered rows (10) and the
      // buffer below them (10) stand in, plus the chart.
      await waitFor(() =>
        expect(socket.subscribedMarketIds()).toEqual(
          sorted([...CHART_MARKETS, ...range(0, 19)]),
        ),
      );
      expect(socket.subscribedMarketIds()).not.toContain(marketId(255));

      // Scroll to Markets 255 to 258, past the 250th Market of the Event.
      await act(async () => {
        fireEvent(
          view.getByTestId(EventMarketListTestIds.ROOT),
          'onViewableItemsChanged',
          {
            viewableItems: [255, 256, 257, 258].map((index) => ({
              item: { type: 'standard', market: event.markets[index] },
            })),
          },
        );
      });

      // The viewable rows and ten rows above them (none remain below) are
      // live; the rows scrolled past have left the gateway.
      await waitFor(() =>
        expect(socket.subscribedMarketIds()).toEqual(
          sorted([...CHART_MARKETS, ...range(245, 259)]),
        ),
      );
      expect(socket.subscribedMarketIds()).not.toContain(marketId(19));
      expect(socket.subscribedMarketIds().length).toBeLessThanOrEqual(
        PREDICT_LIVE_DATA_DEFAULT_MARKET_MAX_PER_CONNECTION,
      );
    });
  });

  describe('Positions tab', () => {
    const fetchMock = jest.fn<Promise<Response>, [string, RequestInit?]>();
    /** Composed real services to destroy after each test. */
    const composedServices: ReturnType<
      typeof composePredictNextPortfolioTrading
    >[] = [];
    /** Engine boundary restorations registered by a test. */
    const testRestores: (() => void)[] = [];

    beforeEach(() => {
      // Positions discovery is skipped while the device reports offline.
      netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    });

    afterEach(() => {
      netInfoMock.__resetMockNetInfo();
      testRestores.splice(0).forEach((restore) => restore());
      composedServices.splice(0).forEach((composed) => composed.destroy());
      delete (Engine.context as Record<string, unknown>).PredictOrderService;
    });

    /** Routes the shared renderer's UI query client messenger adapter to
     * the real services' root, keeping fixture answers for the rest. */
    const observeRealPortfolioReads = (
      trading: ReturnType<typeof composePredictNextPortfolioTrading>,
    ) => {
      const controllerMessenger = Engine.controllerMessenger as unknown as {
        call: (action: string, ...params: unknown[]) => Promise<unknown>;
        subscribe: (
          event: string,
          callback: (...args: unknown[]) => void,
        ) => void;
        unsubscribe: (
          event: string,
          callback: (...args: unknown[]) => void,
        ) => void;
      };
      const originalCall = controllerMessenger.call;
      const originalSubscribe = controllerMessenger.subscribe;
      const originalUnsubscribe = controllerMessenger.unsubscribe;
      testRestores.push(() => {
        controllerMessenger.call = originalCall;
        controllerMessenger.subscribe = originalSubscribe;
        controllerMessenger.unsubscribe = originalUnsubscribe;
      });
      // Direct property swap, not jest.spyOn: the mocked
      // controllerMessenger's methods are already Jest mocks, and a spy
      // here re-enters itself when the fixture delegate is the same mock.
      controllerMessenger.call = (action: string, ...params: unknown[]) => {
        if (action.startsWith('PredictPortfolioService:')) {
          // The composition root is a MockAnyNamespace messenger: it
          // accepts any action the real services registered.
          return (
            trading.rootMessenger.call as unknown as (
              action: string,
              ...params: unknown[]
            ) => Promise<unknown>
          )(action, ...params);
        }
        return originalCall(action, ...params);
      };
      controllerMessenger.subscribe = (event, callback) => {
        if (event.startsWith('PredictPortfolioService:')) {
          (
            trading.rootMessenger.subscribe as unknown as (
              event: string,
              callback: (...args: unknown[]) => void,
            ) => void
          )(event, callback);
        }
      };
      controllerMessenger.unsubscribe = (event, callback) => {
        if (event.startsWith('PredictPortfolioService:')) {
          (
            trading.rootMessenger.unsubscribe as unknown as (
              event: string,
              callback: (...args: unknown[]) => void,
            ) => void
          )(event, callback);
        }
      };
    };

    /** Adding the Positions tab changes the TabsBar tab set, which remounts
     * every Tab from a later effect. That remount can land while a find
     * query settles, so press a fresh lookup, never the resolved element. */
    const pressPositionsTab = async (
      view: ReturnType<typeof renderPredictEventScreen>,
    ) => {
      await view.findByTestId(EventMarketListTestIds.POSITIONS_TAB);
      fireEvent.press(view.getByTestId(EventMarketListTestIds.POSITIONS_TAB));
    };

    it('renders held Positions for the Event Markets and opens the bounded Cash Out flow', async () => {
      configurePredictNextFeeds({
        details: [createEvent()],
        positions: [
          makePredictNextPosition({
            marketId: 'market-1',
            side: 'yes',
            shares: '75.00',
            context: {
              eventId: 'unrelated-event',
              eventTitle: 'Unrelated Event title',
              marketQuestion: 'Will it happen?',
              outcomeId: 'yes',
              outcomeLabel: 'Lakers',
            },
          }),
        ],
      });
      (Engine.context as Record<string, unknown>).PredictOrderService =
        composePredictNextOrderService();
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const view = renderPredictEventScreen(routeParams);
      await pressPositionsTab(view);

      expect(
        view.getByTestId(EventMarketListTestIds.positionRow('market-1', 'yes')),
      ).toBeOnTheScreen();

      fireEvent.press(
        view.getByTestId(
          EventMarketListTestIds.positionCashOut('market-1', 'yes'),
        ),
      );

      expect(
        await view.findByTestId(PredictOrderFlowTestIds.SHEET),
      ).toBeOnTheScreen();
      // The sell sheet binds to the Position's whole-contract size and the
      // canonical identity of the presented Event, not the Position's stale
      // catalog context.
      expect(
        view.getByTestId(PredictOrderFlowTestIds.HELD_CONTRACTS),
      ).toHaveTextContent('You hold 75 contracts');
      expect(
        view.getByTestId(PredictOrderFlowTestIds.OUTCOME_LABEL),
      ).toHaveTextContent('Yes');
    });

    it("titles a threshold Position by its context's Market labels, not its Yes or No label", async () => {
      const event = makePredictNextPlayerPropsEvent();
      const labelled = `${event.id}-rushing_yards-Rhamondre Stevenson-60`;
      const unlabelled = `${event.id}-rushing_yards-Kenneth Walker-50`;
      configurePredictNextFeeds({
        details: [
          {
            ...event,
            venueId,
            id: eventId,
          },
        ],
        positions: [
          makePredictNextPosition({
            marketId: labelled,
            side: 'yes',
            context: {
              eventId,
              eventTitle: 'Patriots vs Seahawks',
              marketQuestion: 'Rhamondre Stevenson: 60+',
              outcomeLabel: 'Yes',
              marketLabels: ['Rhamondre Stevenson', '60+'],
            },
          }),
          makePredictNextPosition({
            marketId: unlabelled,
            side: 'no',
            context: {
              eventId,
              eventTitle: 'Patriots vs Seahawks',
              marketQuestion: 'Kenneth Walker: 50+',
              outcomeLabel: 'No',
              marketLabels: ['50+'],
            },
          }),
        ],
      });

      const view = renderPredictEventScreen(routeParams);
      await pressPositionsTab(view);

      const labelledRow = view.getByTestId(
        EventMarketListTestIds.positionRow(labelled, 'yes'),
      );
      expect(
        within(labelledRow).getByText('Yes · Rhamondre Stevenson · 60+'),
      ).toBeOnTheScreen();
      expect(
        within(labelledRow).getByLabelText(
          /^Yes · Rhamondre Stevenson · 60\+, /u,
        ),
      ).toBeOnTheScreen();
      const unlabelledRow = view.getByTestId(
        EventMarketListTestIds.positionRow(unlabelled, 'no'),
      );
      expect(within(unlabelledRow).getByText('No · 50+')).toBeOnTheScreen();
      expect(
        within(unlabelledRow).getByLabelText(/^No · 50\+, /u),
      ).toBeOnTheScreen();
    });

    it('walks later Positions pages for held Positions beyond the first page', async () => {
      configurePredictNextFeeds({
        details: [createEvent()],
        positionPages: [
          {
            positions: [makePredictNextPosition({ marketId: 'page-1-market' })],
            nextCursor: 'cursor-page-2',
          },
          {
            cursor: 'cursor-page-2',
            positions: [
              makePredictNextPosition({
                marketId: 'market-1',
                side: 'yes',
                shares: '75.00',
                context: {
                  eventId: 'unrelated-event',
                  eventTitle: 'Unrelated Event title',
                  marketQuestion: 'Will it happen?',
                  outcomeId: 'yes',
                  outcomeLabel: 'Lakers',
                },
              }),
            ],
          },
        ],
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const view = renderPredictEventScreen(routeParams);
      await pressPositionsTab(view);

      // The Positions tab is list-header UI. It can paint once page 1
      // exists while the held row still waits on the page-2 read and the
      // list item mount. findBy's default 1000ms budget expired on CI
      // after that wait was added, so wait until the walked page is
      // requested and both the row and its Cash Out control are on screen.
      await waitFor(
        () => {
          expect(
            messengerCall.mock.calls.some(
              ([action, , , cursor]) =>
                action === 'PredictPortfolioService:getPositions' &&
                cursor === 'cursor-page-2',
            ),
          ).toBe(true);
          expect(
            view.getByTestId(
              EventMarketListTestIds.positionRow('market-1', 'yes'),
            ),
          ).toBeOnTheScreen();
          expect(
            view.getByTestId(
              EventMarketListTestIds.positionCashOut('market-1', 'yes'),
            ),
          ).toBeOnTheScreen();
        },
        { timeout: 5000 },
      );
    });

    it('stops walking venue-wide Positions pages at the screen bound', async () => {
      const fillerPages = Array.from({ length: 8 }, (_, index) => ({
        ...(index > 0 ? { cursor: `cursor-page-${index + 1}` } : {}),
        positions: [makePredictNextPosition({ marketId: `filler-${index}` })],
        nextCursor: `cursor-page-${index + 2}`,
      }));
      configurePredictNextFeeds({
        details: [createEvent()],
        positionPages: fillerPages,
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Five pages in total (the initial read plus four walks) even though
      // the fixture keeps serving cursors: the walk must not exceed its
      // bound, so the sixth page's cursor is never requested.
      const walkedCalls = messengerCall.mock.calls.filter(
        ([action, , , cursor]) =>
          action === 'PredictPortfolioService:getPositions' &&
          cursor !== undefined,
      );
      expect(walkedCalls).toHaveLength(4);
      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
    });

    it('stops the page walk when a later Positions page fails', async () => {
      configurePredictNextFeeds({
        details: [createEvent()],
        positionPages: [
          {
            positions: [makePredictNextPosition({ marketId: 'page-1-market' })],
            nextCursor: 'cursor-page-2',
          },
        ],
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      // Exactly one walk attempt: the failed page is never retried mid-visit.
      const walkedCalls = messengerCall.mock.calls.filter(
        ([action, , , cursor]) =>
          action === 'PredictPortfolioService:getPositions' &&
          cursor !== undefined,
      );
      expect(walkedCalls).toHaveLength(1);
      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
    });

    it('updates the mounted Position read after a Cash Out fills', async () => {
      // Real services over the stubbed transport: the Positions read the
      // Positions tab observes runs through the real Portfolio service cache and
      // its cacheUpdated events, the way the Engine composes them.
      let positionsBody: unknown = {
        venueId: 'kalshi',
        positions: [
          makePredictNextPosition({
            marketId: 'market-1',
            side: 'yes',
            shares: '75.00',
            context: {
              eventId: 'unrelated-event',
              eventTitle: 'Unrelated Event title',
              marketQuestion: 'Will it happen?',
              outcomeId: 'yes',
              outcomeLabel: 'Lakers',
            },
          }),
        ],
      };
      fetchMock.mockImplementation(async (url, init) => {
        if (String(url).endsWith('/orders/commit')) {
          return {
            ok: true,
            status: 200,
            json: async () =>
              makePredictNextSellReceipt({
                status: 'partially_filled',
                filledContracts: '37.50',
                averageFillPrice: '0.4700',
                fee: '0.20',
                actualProceeds: '19.74',
                netProceeds: '19.54',
              }),
          } as Response;
        }
        if (String(url).endsWith('/orders/preview')) {
          const body = JSON.parse(String(init?.body)) as {
            marketId: string;
            contracts: string;
          };
          return {
            ok: true,
            status: 200,
            json: async () =>
              makePredictNextSellPreview({
                marketId: body.marketId,
                requestedContracts: Number(body.contracts),
              }),
          } as Response;
        }
        if (String(url).includes('/venues/kalshi/positions')) {
          return {
            ok: true,
            status: 200,
            json: async () => positionsBody,
          } as Response;
        }
        return { ok: false, status: 404, json: async () => ({}) } as Response;
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      configurePredictNextFeeds({ details: [createEvent()] });
      const trading = composePredictNextPortfolioTrading();
      composedServices.push(trading);
      (Engine.context as Record<string, unknown>).PredictOrderService =
        trading.orderService;
      observeRealPortfolioReads(trading);

      const view = renderPredictEventScreen(routeParams);
      await pressPositionsTab(view);

      // Header tab and row item mount separately. Press the Cash Out
      // control only after that row's button is on screen.
      fireEvent.press(
        await view.findByTestId(
          EventMarketListTestIds.positionCashOut('market-1', 'yes'),
          {},
          { timeout: 5000 },
        ),
      );
      await view.findByTestId(PredictOrderFlowTestIds.SHEET);
      fireEvent.press(
        view.getByTestId(PredictOrderFlowTestIds.QUICK_CONTRACT('max')),
      );
      await waitFor(() =>
        expect(view.getByTestId(PredictOrderFlowTestIds.REVIEW)).toBeEnabled(),
      );
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.REVIEW));
      await waitFor(() =>
        expect(
          view.getByTestId(PredictOrderFlowTestIds.APPROVAL),
        ).toBeOnTheScreen(),
      );
      // Real elapsed time between the pre-trade read and the receipt, so
      // the refreshed snapshot's dataUpdatedAt is strictly newer — the
      // property the UI cache's hydration applies.
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      // The venue reports the reduced Position while the sheet is up: the
      // terminal receipt's invalidation must refresh the mounted read
      // through the service without any focus or staleTime workaround.
      positionsBody = {
        venueId: 'kalshi',
        positions: [
          makePredictNextPosition({
            marketId: 'market-1',
            side: 'yes',
            shares: '37.50',
            currentValue: '22.50',
            context: {
              eventId: 'unrelated-event',
              eventTitle: 'Unrelated Event title',
              marketQuestion: 'Will it happen?',
              outcomeId: 'yes',
              outcomeLabel: 'Lakers',
            },
          }),
        ],
      };

      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.APPROVE));
      await view.findByTestId(PredictOrderFlowTestIds.DONE);
      fireEvent.press(view.getByTestId(PredictOrderFlowTestIds.DONE));

      await waitFor(() =>
        expect(
          view.getByTestId(
            EventMarketListTestIds.positionValue('market-1', 'yes'),
          ),
        ).toHaveTextContent('$22.50'),
      );
    });

    it('omits the Positions tab when the Positions read fails and keeps the Markets browsable', async () => {
      configurePredictNextFeeds({
        details: [createEvent()],
        positions: new Error('positions unavailable'),
      });

      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(
        PredictEventScreenTestIds.STANDARD_HEADER,
        {},
        EVENT_LOAD,
      );

      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(MarketStandardCardTestIds.yesButton('market-1')),
      ).toBeOnTheScreen();
    });

    it('omits the Positions tab when the Predict User holds no Position in this Event', async () => {
      configurePredictNextFeeds({
        details: [createEvent()],
        positions: [makePredictNextPosition()],
      });

      const view = renderPredictEventScreen(routeParams);
      await view.findByTestId(
        PredictEventScreenTestIds.STANDARD_HEADER,
        {},
        EVENT_LOAD,
      );

      // The fixture Position targets an unrelated Market.
      expect(
        view.queryByTestId(EventMarketListTestIds.POSITIONS_TAB),
      ).not.toBeOnTheScreen();
    });
  });
});
