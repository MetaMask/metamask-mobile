import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventDetailTestIds } from '../PredictEventDetail/PredictEventDetail.testIds';
import type { PredictEvent, PredictTimestamp } from '../../types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';

const event: PredictEvent = {
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: 'event-1' as PredictEvent['id'],
  title: 'Who wins the election?',
  subtitle: 'Election 2028',
  category: 'Politics',
  volume: '1500000',
  imageUrl: 'https://example.com/event.png',
  markets: [
    {
      id: 'market-1' as PredictEvent['markets'][number]['id'],
      question: 'Candidate A wins',
      status: 'active',
      outcomes: [
        {
          id: 'yes-1' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'yes',
          label: 'Yes',
          askPrice:
            '0.42' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
        {
          id: 'no-1' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'no',
          label: 'No',
          askPrice:
            '0.58' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
      ],
    },
  ],
};

const gameEvent: PredictEvent = {
  ...event,
  id: 'game-event' as PredictEvent['id'],
  title: 'Cardinals vs Panthers',
  sports: {
    sport: {
      id: 'american-football' as PredictEvent['id'],
      label: 'American football',
    },
    competition: { id: 'nfl' as PredictEvent['id'], label: 'NFL' },
    game: {
      status: 'in_progress',
      awayTeam: { name: 'Arizona Cardinals', abbreviation: 'ARI' },
      homeTeam: { name: 'Carolina Panthers', abbreviation: 'CAR' },
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '12:22',
      observedAt: '2026-01-01T00:00:00Z' as PredictTimestamp,
    },
  },
  markets: [
    {
      ...event.markets[0],
      id: 'away-market' as PredictEvent['markets'][number]['id'],
      status: 'active',
      outcomes: [
        { ...event.markets[0].outcomes[0], gameSelection: 'away' },
        event.markets[0].outcomes[1],
      ],
    },
    {
      ...event.markets[0],
      id: 'home-market' as PredictEvent['markets'][number]['id'],
      status: 'active',
      outcomes: [
        { ...event.markets[0].outcomes[0], gameSelection: 'home' },
        event.markets[0].outcomes[1],
      ],
    },
  ],
};

const multiMarketEvent: PredictEvent = {
  ...event,
  id: 'event-2' as PredictEvent['id'],
  title: 'Multi-market election',
  markets: [
    ...event.markets,
    ...(['market-2', 'market-3', 'market-4'] as const).map((marketId) => ({
      ...event.markets[0],
      id: marketId as PredictEvent['markets'][number]['id'],
    })),
  ],
};

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const configureQueries = (
  events: readonly PredictEvent[] = [event],
  status: 'available' | 'degraded' | 'unavailable' = 'available',
) => {
  messengerCall.mockImplementation((action: string) => {
    if (action === 'PredictMarketDataService:getVenueStatus') {
      return Promise.resolve({
        venueId: 'kalshi',
        status,
        checkedAt: '2026-01-01T00:00:00Z',
      });
    }
    if (action === 'PredictMarketDataService:getFeed') {
      return Promise.resolve({
        venueId: 'kalshi',
        id: 'sports-football-nfl-games',
        title: 'NFL Games',
        events,
      });
    }
    return Promise.resolve(undefined);
  });
};

describe('PredictHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureQueries();
  });

  it('tracks the homepage balance breakdown entry point', async () => {
    const view = renderPredictNext({
      entryPoint: PredictEventValues.ENTRY_POINT.HOMESCREEN_BALANCE_BREAKDOWN,
    });

    await waitFor(() =>
      expect(
        Engine.context.PredictController.trackHomeViewed,
      ).toHaveBeenCalledWith({
        entryPoint: 'homescreen_balance_breakdown',
      }),
    );

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'event-1'),
      ),
    );
    await view.findByTestId(PredictEventDetailTestIds.VIEW);
    fireEvent.press(view.getByTestId(PredictEventDetailTestIds.BACK));

    await waitFor(() =>
      expect(
        Engine.context.PredictController.trackHomeViewed,
      ).toHaveBeenLastCalledWith({
        entryPoint: undefined,
      }),
    );
  });

  it('loads complete Event data through the Engine messenger', async () => {
    const view = renderPredictNext();

    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'event-1'),
    );

    expect(within(card).getByText('Who wins the election?')).toBeOnTheScreen();
    expect(within(card).getByText('Yes')).toBeOnTheScreen();
    expect(within(card).getByText('2.38x')).toBeOnTheScreen();
    expect(within(card).getByText('42¢')).toBeOnTheScreen();
    expect(within(card).getByText('No')).toBeOnTheScreen();
    expect(within(card).getByText('1.72x')).toBeOnTheScreen();
    expect(within(card).getByText('58¢')).toBeOnTheScreen();
    expect(
      within(card).getByTestId(PredictHomeTestIds.image('event-1')),
    ).toBeOnTheScreen();
    expect(
      within(card).getByTestId(PredictHomeTestIds.category('event-1')),
    ).toBeOnTheScreen();
    expect(
      within(card).getByTestId(PredictHomeTestIds.volume('event-1')),
    ).toHaveTextContent('$1.5M Vol');
  });

  it('opens American-football Game detail from the compact Game card', async () => {
    configureQueries([event, gameEvent]);
    const view = renderPredictNext();
    const gameCard = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'game-event'),
    );

    expect(within(gameCard).getByText('Arizona Cardinals')).toBeOnTheScreen();
    expect(within(gameCard).queryByText(gameEvent.title)).not.toBeOnTheScreen();
    fireEvent.press(
      within(gameCard).getByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'game-event'),
      ),
    );

    expect(
      await view.findByTestId(PredictEventDetailTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText(gameEvent.title)).toBeOnTheScreen();
  });

  it('renders a non-American-football Game with the standard card', async () => {
    const soccerEvent: PredictEvent = {
      ...gameEvent,
      id: 'soccer-event' as PredictEvent['id'],
      title: 'Soccer championship',
      sports: {
        ...gameEvent.sports,
        sport: {
          id: 'soccer' as PredictEvent['id'],
          label: 'Soccer',
        },
      } as PredictEvent['sports'],
    };
    configureQueries([soccerEvent]);
    const view = renderPredictNext();

    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'soccer-event'),
    );

    expect(within(card).getByText(soccerEvent.title)).toBeOnTheScreen();
    expect(within(card).queryByText('Arizona Cardinals')).not.toBeOnTheScreen();
  });

  it('does not navigate when an Outcome is pressed', async () => {
    const view = renderPredictNext();
    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'event-1'),
    );

    fireEvent.press(
      within(card).getByTestId(PredictHomeTestIds.outcome('event-1', 'yes')),
    );

    expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventDetailTestIds.VIEW),
    ).not.toBeOnTheScreen();
  });

  it('opens detail from More for a multi-market Event', async () => {
    configureQueries([event, multiMarketEvent]);
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event('kalshi', multiMarketEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.more('event-1')),
    ).not.toBeOnTheScreen();

    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.more(multiMarketEvent.id)),
    );

    expect(
      await view.findByTestId(PredictEventDetailTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText(multiMarketEvent.title)).toBeOnTheScreen();
  });

  it('opens detail and returns without fetching Event detail', async () => {
    const view = renderPredictNext();
    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'event-1'),
      ),
    );

    expect(
      await view.findByTestId(PredictEventDetailTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Who wins the election?')).toBeOnTheScreen();
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      expect.anything(),
      expect.anything(),
    );

    fireEvent.press(view.getByTestId(PredictEventDetailTestIds.BACK));

    await waitFor(() =>
      expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen(),
    );
  });

  it('shows an empty state after an empty Event response', async () => {
    configureQueries([]);

    const view = renderPredictNext();

    expect(await view.findByText('No predictions yet.')).toBeOnTheScreen();
    expect(
      messengerCall.mock.calls.some(
        (call) => call[0] === 'PredictMarketDataService:getVenueStatus',
      ),
    ).toBe(true);
  });

  it('does not fetch Venue Status when Events are available', async () => {
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'event-1')),
    ).toBeOnTheScreen();
    expect(
      messengerCall.mock.calls.filter(
        (call) => call[0] === 'PredictMarketDataService:getVenueStatus',
      ),
    ).toHaveLength(0);
  });

  it('retries the Feed after a first-page error', async () => {
    configureQueries();
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictMarketDataService:getFeed') {
        return Promise.reject(new Error('feed failed'));
      }
      return Promise.resolve(undefined);
    });
    const view = renderPredictNext();
    const retry = await view.findByText('Retry');
    configureQueries();
    messengerCall.mockClear();

    fireEvent.press(retry);

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        undefined,
      ),
    );
    expect(
      messengerCall.mock.calls.filter(
        (call) => call[0] === 'PredictMarketDataService:getVenueStatus',
      ),
    ).toHaveLength(0);
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'event-1')),
    ).toBeOnTheScreen();
  });

  it('shows unavailable when no Events can be displayed', async () => {
    configureQueries([], 'unavailable');

    const view = renderPredictNext();

    expect(
      await view.findByText('Predictions are unavailable.'),
    ).toBeOnTheScreen();
  });

  it('preserves Events and retries a failed next page from the footer', async () => {
    configureQueries();
    let eventRequest = 0;
    messengerCall.mockImplementation((action: string) => {
      if (action === 'PredictMarketDataService:getVenueStatus') {
        return Promise.resolve({
          venueId: 'kalshi',
          status: 'available',
          checkedAt: '2026-01-01T00:00:00Z',
        });
      }
      if (action === 'PredictMarketDataService:getFeed') {
        eventRequest += 1;
        if (eventRequest === 1) {
          return Promise.resolve({
            venueId: 'kalshi',
            id: 'sports-football-nfl-games',
            title: 'NFL Games',
            events: [event],
            nextCursor: 'next',
          });
        }
        if (eventRequest === 2) {
          return Promise.reject(new Error('next page failed'));
        }
        return Promise.resolve({
          venueId: 'kalshi',
          id: 'sports-football-nfl-games',
          title: 'NFL Games',
          events: [{ ...event, id: 'event-2', title: 'Second Event' }],
        });
      }
      return Promise.resolve(undefined);
    });
    const view = renderPredictNext();
    const feed = await view.findByTestId(PredictHomeTestIds.FEED);

    fireEvent(feed, 'onEndReached');
    const retry = await view.findByTestId(PredictHomeTestIds.FOOTER_RETRY);

    expect(view.getByText('Who wins the election?')).toBeOnTheScreen();
    fireEvent.press(retry);
    expect(await view.findByText('Second Event')).toBeOnTheScreen();
  });

  it('renders Events when Venue Status is unavailable', async () => {
    configureQueries([event], 'unavailable');

    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'event-1')),
    ).toBeOnTheScreen();
  });
});
