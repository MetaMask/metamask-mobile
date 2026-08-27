import '../../../../../../tests/component-view/mocks';
import { renderPredictFeedScreen } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, within } from '@testing-library/react-native';
import {
  KALSHI_VENUE_ID,
  type PredictDecimal,
  type PredictEntityId,
  type PredictEvent,
  type PredictFeedId,
  type PredictMarket,
  type PredictOutcome,
  type PredictTimestamp,
} from '../../types';
import {
  NCAA_FEED_SCREEN_ID,
  NCAA_GAMES_FEED_ID,
  NCAA_WIN_TOTALS_FEED_ID,
  NFL_FEED_SCREEN_ID,
  NFL_GAMES_FEED_ID,
  NFL_WIN_TOTALS_FEED_ID,
} from '../../navigation/feedScreens';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictFeedScreenTestIds } from './PredictFeedScreen.testIds';

const makeOutcome = (
  id: string,
  side: 'yes' | 'no',
  gameSelection?: 'away' | 'home',
): PredictOutcome => ({
  id: id as PredictEntityId,
  side,
  label: side === 'yes' ? 'Yes' : 'No',
  askPrice: (side === 'yes' ? '0.42' : '0.58') as PredictDecimal,
  ...(gameSelection ? { gameSelection } : {}),
});

const makeMarket = (id: string, question: string): PredictMarket => ({
  id: id as PredictEntityId,
  question,
  status: 'active',
  outcomes: [makeOutcome(`${id}-yes`, 'yes'), makeOutcome(`${id}-no`, 'no')],
});

const makeEvent = (id: string, title: string): PredictEvent => ({
  venueId: KALSHI_VENUE_ID,
  id: id as PredictEntityId,
  title,
  category: 'Sports',
  volume: '1500000',
  markets: [makeMarket(`${id}-market`, title)],
});

const makeGameMarket = (
  id: string,
  question: string,
  selection: 'away' | 'home',
): PredictMarket => ({
  id: id as PredictEntityId,
  question,
  status: 'active',
  outcomes: [
    makeOutcome(`${id}-yes`, 'yes', selection),
    makeOutcome(`${id}-no`, 'no'),
  ],
});

const makeGameEvent = (id: string): PredictEvent => ({
  ...makeEvent(id, 'Packers vs Steelers'),
  sports: {
    sport: {
      id: 'american-football' as PredictEntityId,
      label: 'American football',
    },
    game: {
      status: 'in_progress',
      awayTeam: { name: 'Packers', abbreviation: 'GB' },
      homeTeam: { name: 'Steelers', abbreviation: 'PIT' },
      score: { away: '17', home: '21' },
      period: 'Q4',
      clock: '12:22',
      observedAt: '2026-08-19T12:00:00Z' as PredictTimestamp,
    },
  },
  markets: [
    makeGameMarket(`${id}-away`, 'Away team', 'away'),
    makeGameMarket(`${id}-home`, 'Home team', 'home'),
  ],
});

interface FeedPage {
  events: readonly PredictEvent[];
  nextCursor?: string;
}

type FeedResponseValue = readonly PredictEvent[] | FeedPage | Error;
type FeedResponse =
  | FeedResponseValue
  | ((cursor?: string) => FeedResponseValue);

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const configureFeeds = (feeds: Partial<Record<string, FeedResponse>> = {}) => {
  messengerCall.mockImplementation(
    (
      action: string,
      venueId: string,
      feedId: PredictFeedId,
      _params: unknown,
      cursor?: string,
    ): Promise<unknown> => {
      if (action !== 'PredictMarketDataService:getFeed') {
        return Promise.resolve(undefined);
      }

      const configured = feeds[feedId] ?? [];
      const result =
        typeof configured === 'function' ? configured(cursor) : configured;
      if (result instanceof Error) {
        return Promise.reject(result);
      }

      const page = Array.isArray(result) ? { events: result } : result;
      return Promise.resolve({
        venueId,
        id: feedId,
        title: feedId,
        ...page,
      });
    },
  );
};

const gameEvent = makeGameEvent('game-1');
const secondGameEvent = makeGameEvent('game-2');
const propsEvent = makeEvent('props-1', 'NFL Win Total');

const invalidFeedScreenParams = {
  venueId: KALSHI_VENUE_ID,
  feedScreenId: 'missing-feed-screen',
} as unknown as Parameters<typeof renderPredictFeedScreen>[0];

describe('PredictFeedScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureFeeds();
  });

  it('shows an unavailable state for an unknown Feed Screen and returns Home', async () => {
    const view = renderPredictFeedScreen(invalidFeedScreenParams);

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.UNAVAILABLE),
    ).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });

  it.each([
    {
      feedScreenId: NFL_FEED_SCREEN_ID,
      feedId: NFL_GAMES_FEED_ID,
      event: gameEvent,
      label: 'NFL',
    },
    {
      feedScreenId: NCAA_FEED_SCREEN_ID,
      feedId: NCAA_GAMES_FEED_ID,
      event: secondGameEvent,
      label: 'NCAAF',
    },
  ] as const)(
    'uses the default Games Feed for $label',
    async ({ feedScreenId, feedId, event }) => {
      configureFeeds({ [feedId]: [event] });

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
      });

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, event.id),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        KALSHI_VENUE_ID,
        feedId,
        { limit: 20 },
        undefined,
      );
    },
  );

  it.each([
    {
      feedScreenId: NFL_FEED_SCREEN_ID,
      feedId: NFL_WIN_TOTALS_FEED_ID,
      label: 'NFL',
    },
    {
      feedScreenId: NCAA_FEED_SCREEN_ID,
      feedId: NCAA_WIN_TOTALS_FEED_ID,
      label: 'NCAAF',
    },
  ] as const)(
    'uses the Win Totals Feed for the $label Props tab',
    async ({ feedScreenId, feedId }) => {
      configureFeeds({ [feedId]: [propsEvent] });

      const view = renderPredictFeedScreen({
        venueId: KALSHI_VENUE_ID,
        feedScreenId,
        selectedTabId: 'props',
      });

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        KALSHI_VENUE_ID,
        feedId,
        { limit: 20 },
        undefined,
      );
    },
  );

  it('switches between Games and Props with independent cached state', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('games')).props
        .accessibilityState,
    ).toEqual({ selected: true });

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('props')));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).not.toBeOnTheScreen();
    expect(
      view.getByTestId(PredictFeedScreenTestIds.tab('props')).props
        .accessibilityState,
    ).toEqual({ selected: true });
    expect(messengerCall).toHaveBeenCalledWith(
      'PredictMarketDataService:getFeed',
      KALSHI_VENUE_ID,
      NFL_WIN_TOTALS_FEED_ID,
      { limit: 20 },
      undefined,
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      view.queryByTestId(PredictFeedScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
    expect(messengerCall.mock.calls).toHaveLength(3);
  });

  it('keeps the loaded Feed when the selected tab is pressed again', async () => {
    configureFeeds({ [NFL_GAMES_FEED_ID]: [gameEvent] });
    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      view.getByTestId(PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id)),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictFeedScreenTestIds.LOADING),
    ).not.toBeOnTheScreen();
    expect(messengerCall).toHaveBeenCalledTimes(1);
  });

  it('shows loading and then renders the loaded Events', async () => {
    let resolveFeed: (value: unknown) => void = () => undefined;
    messengerCall.mockImplementation(
      (action: string): Promise<unknown> =>
        action === 'PredictMarketDataService:getFeed'
          ? new Promise((resolve) => {
              resolveFeed = resolve;
            })
          : Promise.resolve(undefined),
    );

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.LOADING),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveFeed({
        venueId: KALSHI_VENUE_ID,
        id: NFL_GAMES_FEED_ID,
        title: 'NFL Games',
        events: [gameEvent],
      });
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('retries an initial error and renders the Events after recovery', async () => {
    let shouldFail = true;
    configureFeeds({
      [NFL_GAMES_FEED_ID]: () =>
        shouldFail ? new Error('Feed unavailable') : [gameEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.ERROR),
    ).toBeOnTheScreen();

    shouldFail = false;
    await act(async () => {
      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.RETRY));
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('renders an empty Props state without affecting the Games tab', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent],
      [NFL_WIN_TOTALS_FEED_ID]: [],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
      selectedTabId: 'props',
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.EMPTY),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).not.toBeOnTheScreen();

    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.tab('games')));

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('fetches the next page and shows its loading state', async () => {
    let resolveNextPage: (value: unknown) => void = () => undefined;
    messengerCall.mockImplementation(
      (
        action: string,
        venueId: string,
        feedId: PredictFeedId,
        _params: unknown,
        cursor?: string,
      ): Promise<unknown> => {
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        if (cursor) {
          return new Promise((resolve) => {
            resolveNextPage = resolve;
          });
        }
        return Promise.resolve({
          venueId,
          id: feedId,
          title: 'NFL Games',
          events: [gameEvent],
          nextCursor: 'page-2',
        });
      },
    );

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });
    await view.findByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );

    await act(async () => {
      fireEvent(
        view.getByTestId(PredictFeedScreenTestIds.LIST),
        'onEndReached',
      );
    });

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.NEXT_PAGE_LOADING),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNextPage({
        venueId: KALSHI_VENUE_ID,
        id: NFL_GAMES_FEED_ID,
        title: 'NFL Games',
        events: [secondGameEvent],
      });
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.event(KALSHI_VENUE_ID, secondGameEvent.id),
      ),
    ).toBeOnTheScreen();
  });

  it('uses the correct card composition for each Event type', async () => {
    configureFeeds({
      [NFL_GAMES_FEED_ID]: [gameEvent, propsEvent],
    });

    const view = renderPredictFeedScreen({
      venueId: KALSHI_VENUE_ID,
      feedScreenId: NFL_FEED_SCREEN_ID,
    });

    expect(
      await view.findByTestId(
        PredictHomeTestIds.gameQuote(gameEvent.id, 'away'),
      ),
    ).toBeOnTheScreen();
    const gameCard = view.getByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, gameEvent.id),
    );
    expect(within(gameCard).getByText('Packers')).toBeOnTheScreen();
    expect(within(gameCard).getByText('Steelers')).toBeOnTheScreen();
    expect(within(gameCard).getByText('17')).toBeOnTheScreen();
    expect(within(gameCard).getByText('21')).toBeOnTheScreen();

    const propsCard = view.getByTestId(
      PredictHomeTestIds.event(KALSHI_VENUE_ID, propsEvent.id),
    );
    expect(within(propsCard).getByText(propsEvent.title)).toBeOnTheScreen();
    expect(
      within(propsCard).getByTestId(
        PredictHomeTestIds.outcome(propsEvent.id, 'yes'),
      ),
    ).toBeOnTheScreen();
    expect(within(propsCard).getByText('Sports')).toBeOnTheScreen();
    expect(within(propsCard).getByText('$1.5M Vol')).toBeOnTheScreen();
  });
});
