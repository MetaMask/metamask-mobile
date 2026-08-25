import '../../../../../../tests/component-view/mocks';
import { makePredictNextMultiMarketEvent } from '../../../../../../tests/component-view/fixtures/predictNext';
import { renderPredictEventScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { MarketListTestIds } from '../../events/markets/MarketList.testIds';
import { MarketStandardCardTestIds } from '../../events/markets/MarketStandardCard.testIds';
import type {
  PredictEntityId,
  PredictHttpsUrl,
  PredictEvent,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictEventScreenTestIds } from './PredictEventScreen.testIds';
import { RulesBottomSheetTestIds } from './internal/RulesBottomSheet.testIds';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'event-1' as PredictEntityId;
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
          logoUrl: 'https://example.com/ari.png' as NonNullable<
            NonNullable<
              NonNullable<PredictEvent['sports']>['game']
            >['awayTeam']['logoUrl']
          >,
        },
        homeTeam: { name: 'Carolina Panthers', abbreviation: 'CAR' },
        score: { away: '17', home: '21' },
        period: 'Q4',
        clock: '12:22',
        observedAt: '2026-09-11T02:30:00Z' as PredictTimestamp,
        ...overrides,
      },
    },
  });

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const resolveEvent = (event: PredictEvent = createEvent()) => {
  messengerCall.mockResolvedValue(event);
};

describe('PredictEventScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    expect(messengerCall).toHaveBeenCalledTimes(2);
    expect(messengerCall).toHaveBeenNthCalledWith(
      1,
      'PredictMarketDataService:getEvent',
      venueId,
      eventId,
      undefined,
    );
    expect(messengerCall).toHaveBeenNthCalledWith(
      2,
      'PredictMarketDataService:getEvent',
      venueId,
      eventId,
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
