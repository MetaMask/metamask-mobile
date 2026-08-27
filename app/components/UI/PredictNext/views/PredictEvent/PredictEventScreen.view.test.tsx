import '../../../../../../tests/component-view/mocks';
import { makePredictNextMultiMarketEvent } from '../../../../../../tests/component-view/fixtures/predictNext';
import { renderPredictEventScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { focusManager } from '@tanstack/react-query';
import { processColor, StyleSheet } from 'react-native';
import { MarketListTestIds } from '../../events/markets/MarketList.testIds';
import { MarketStandardCardTestIds } from '../../events/markets/MarketStandardCard.testIds';
import type {
  PredictEntityId,
  PredictHttpsUrl,
  PredictEvent,
  PredictHexColor,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictMarketHistoryTestIds } from './internal/PredictMarketHistory.testIds';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';
import { RulesBottomSheetTestIds } from './internal/RulesBottomSheet.testIds';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
const awayTeamColor = `#${'241773'}` as PredictHexColor;
const homeTeamColor = `#${'E31837'}` as PredictHexColor;
const routeParams = {
  venueId,
  eventId,
  titleSnapshot: 'Snapshot Event title',
};

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
        },
        homeTeam: {
          name: 'Carolina Panthers',
          abbreviation: 'CAR',
          primaryColor: homeTeamColor,
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

const resolveEvent = (event: PredictEvent = createEvent()) => {
  messengerCall.mockImplementation(
    (action: string, _venueId: string, id: string, range?: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(event);
      }
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return Promise.resolve(createHistory(id, range));
      }
      return Promise.resolve(undefined);
    },
  );
};

describe('PredictEventScreen', () => {
  beforeEach(() => {
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
  });

  it('renders all standard Event header fields from the immutable Event', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.STANDARD_HEADER,
    );

    expect(view.getByTestId(PredictEventScreenTestIds.TITLE)).toHaveTextContent(
      'Canonical Event title',
    );
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.SUBTITLE),
    ).toHaveTextContent('Canonical Event subtitle');
    expect(view.getByTestId(PredictEventScreenTestIds.IMAGE)).toBeOnTheScreen();
  });

  it('selects a Market and fetches its history', async () => {
    const firstMarket = createEvent().markets[0];
    const secondMarket = {
      ...firstMarket,
      id: 'market-2' as PredictEntityId,
      question: 'Will the other thing happen?',
      outcomes: [
        { ...firstMarket.outcomes[0], id: 'yes-2' as PredictEntityId },
        { ...firstMarket.outcomes[1], id: 'no-2' as PredictEntityId },
      ] as typeof firstMarket.outcomes,
    };
    resolveEvent(createEvent({ markets: [firstMarket, secondMarket] }));
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    messengerCall.mockClear();
    fireEvent.press(
      view.getByTestId(PredictEventScreenTestIds.market(secondMarket.id)),
    );

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getMarketHistory',
        venueId,
        secondMarket.id,
        'ALL',
        undefined,
      ),
    );
    expect(
      view.getByTestId(PredictEventScreenTestIds.market(secondMarket.id)).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('selects a history range for the same Market', async () => {
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
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getMarketHistory',
        venueId,
        'market-1',
        '1W',
        undefined,
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

  it('retries Market history after an initial error', async () => {
    messengerCall.mockImplementationOnce((action: string) =>
      action === 'PredictMarketDataService:getEvent'
        ? Promise.resolve(createEvent())
        : Promise.resolve(undefined),
    );
    messengerCall
      .mockRejectedValueOnce(new Error('unsafe history detail'))
      .mockResolvedValueOnce(createHistory('market-1'));
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
    messengerCall.mockImplementation(
      (action: string, _venueId: string, id: string, range?: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(createEvent());
        }
        if (action === 'PredictMarketDataService:getMarketHistory') {
          return Promise.resolve(createHistory(id, range, 1));
        }
        return Promise.resolve(undefined);
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
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(createEvent());
      }
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return new Promise(() => undefined);
      }
      return Promise.resolve(undefined);
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
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return Promise.reject(new Error('Market history refetch failed'));
      }
      return Promise.resolve(createEvent());
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
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          awayMarket.id,
          'ALL',
          undefined,
        ],
        [
          'PredictMarketDataService:getMarketHistory',
          venueId,
          homeMarket.id,
          'ALL',
          undefined,
        ],
      ]),
    );
    expect(
      view.queryByTestId(PredictEventScreenTestIds.MARKETS),
    ).not.toBeOnTheScreen();
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
    expect(
      view.queryByTestId(PredictEventScreenTestIds.MARKETS),
    ).not.toBeOnTheScreen();
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
    messengerCall.mockImplementation(
      (action: string, _venueId: string, id: string, range?: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(event);
        }
        if (action === 'PredictMarketDataService:getMarketHistory') {
          return Promise.resolve(
            createHistory(id, range, id === homeMarket.id ? 1 : 2),
          );
        }
        return Promise.resolve(undefined);
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

  it('uses the Game header for a non-football Event with a Game snapshot', async () => {
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
            awayTeam: { name: 'Lakers', abbreviation: 'LAL' },
            homeTeam: { name: 'Celtics', abbreviation: 'BOS' },
            score: { away: '88', home: '91' },
            observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
          },
        },
      }),
    );
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictEventScreenTestIds.GAME_HEADER);

    expect(
      view.queryByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
    ).not.toBeOnTheScreen();
  });

  it('renders complete Market data in backend order', async () => {
    resolveEvent(createMultiMarketEvent());
    const view = renderPredictEventScreen(routeParams);

    expect(
      await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION),
    ).toBeOnTheScreen();
    const list = within(view.getByTestId(MarketListTestIds.ROOT));
    const titles = list.getAllByTestId(MarketStandardCardTestIds.TITLE_PATTERN);
    expect(titles.map(({ props }) => props.children)).toEqual([
      'Dodgers',
      'Yankees',
      'Field',
    ]);

    const dodgersCard = within(
      view.getByTestId(MarketStandardCardTestIds.card('dodgers')),
    );
    expect(dodgersCard.getByText('$3.2M Vol.')).toBeOnTheScreen();
    expect(dodgersCard.getByText('38%')).toBeOnTheScreen();
    expect(dodgersCard.getByText('Yes · 38¢')).toBeOnTheScreen();
    expect(dodgersCard.getByText('No · 62¢')).toBeOnTheScreen();

    const fieldCard = within(
      view.getByTestId(MarketStandardCardTestIds.card('field')),
    );
    expect(fieldCard.queryByText(/ Vol\.$/)).not.toBeOnTheScreen();
    expect(fieldCard.getByText('0%')).toBeOnTheScreen();
    expect(fieldCard.getByText('Yes · 0¢')).toBeOnTheScreen();
    expect(fieldCard.getByText('No')).toBeOnTheScreen();
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

    await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.rulesButton('dodgers')),
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

    await view.findByTestId(PredictEventScreenTestIds.EVENT_RULES_BUTTON);
    fireEvent.press(
      view.getByTestId(PredictEventScreenTestIds.EVENT_RULES_BUTTON),
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

    await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.rulesButton('dodgers')),
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

    await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION);
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.rulesButton('dodgers')),
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

    await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION);

    expect(
      view.queryByTestId(PredictEventScreenTestIds.EVENT_RULES_BUTTON),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(MarketStandardCardTestIds.rulesButton('dodgers')),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(RulesBottomSheetTestIds.SHEET),
    ).not.toBeOnTheScreen();
  });

  it('keeps Outcome presses inside the Event Screen', async () => {
    resolveEvent(createMultiMarketEvent());
    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(PredictEventScreenTestIds.PREDICT_SECTION);
    const serviceCallCount = messengerCall.mock.calls.length;

    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.yesButton('dodgers')),
    );
    fireEvent.press(
      view.getByTestId(MarketStandardCardTestIds.noButton('dodgers')),
    );

    expect(view.getByTestId(PredictEventScreenTestIds.VIEW)).toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(serviceCallCount);
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

    await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER);

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
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('SCHEDULED');
    expect(
      within(header).queryByTestId(PredictEventScreenTestIds.teamScore('away')),
    ).not.toBeOnTheScreen();
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toBeOnTheScreen();
  });

  it('renders the observed score, period, and clock for an in-progress Game', async () => {
    resolveEvent(createGameEvent());
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamName('away')),
    ).toHaveTextContent('Arizona Cardinals');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamName('home')),
    ).toHaveTextContent('Carolina Panthers');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamScore('away')),
    ).toHaveTextContent('17');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamScore('home')),
    ).toHaveTextContent('21');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('LIVE');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toHaveTextContent('Q4 · 12:22');
    expect(
      within(header).getByTestId(
        PredictEventScreenTestIds.teamLogoFallback('home'),
      ),
    ).toHaveTextContent('CAR');
  });

  it('renders a completed Game as final with its observed metadata', async () => {
    resolveEvent(createGameEvent({ status: 'completed' }));
    const view = renderPredictEventScreen(routeParams);

    const header = await view.findByTestId(
      PredictEventScreenTestIds.GAME_HEADER,
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_STATUS),
    ).toHaveTextContent('FINAL');
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.GAME_METADATA),
    ).toHaveTextContent('Q4 · 12:22');
  });

  it('omits unavailable optional standard Event fields', async () => {
    resolveEvent(createEvent({ subtitle: undefined, imageUrl: undefined }));
    const view = renderPredictEventScreen(routeParams);

    await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER);

    expect(
      view.queryByTestId(PredictEventScreenTestIds.SUBTITLE),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.IMAGE),
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

  it('keeps full Team names accessible for long labels', async () => {
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
    );

    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamName('away')),
    ).toHaveTextContent(awayName);
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.teamName('home')),
    ).toHaveTextContent(homeName);
    expect(
      within(header).getByTestId(PredictEventScreenTestIds.team('away')),
    ).toHaveProp('accessibilityLabel', `${awayName}, 17`);
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
      view.queryByTestId(PredictEventScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
  });

  it('retries only the immutable Event query after a blocking error', async () => {
    messengerCall
      .mockRejectedValueOnce(new Error('unsafe transport detail'))
      .mockResolvedValueOnce(createEvent());
    const view = renderPredictEventScreen(routeParams);
    const error = await view.findByTestId(PredictEventScreenTestIds.ERROR);

    fireEvent.press(within(error).getByTestId(PredictEventScreenTestIds.RETRY));

    expect(
      await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
    ).toBeOnTheScreen();
    const eventCalls = messengerCall.mock.calls.filter(
      ([action]) => action === 'PredictMarketDataService:getEvent',
    );
    expect(eventCalls).toEqual([
      ['PredictMarketDataService:getEvent', venueId, eventId, undefined],
      ['PredictMarketDataService:getEvent', venueId, eventId, undefined],
    ]);
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getMarketHistory',
      venueId,
      'market-1',
      'ALL',
      undefined,
    );
  });

  it('returns Home when the Event has no originating screen', async () => {
    resolveEvent();
    const view = renderPredictEventScreen(routeParams);
    await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER);

    fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));

    await waitFor(() =>
      expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen(),
    );
  });
});
