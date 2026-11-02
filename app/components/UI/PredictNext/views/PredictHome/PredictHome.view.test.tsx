import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { EventMarketListTestIds } from '../PredictEvent/internal/EventMarketList.testIds';
import { PredictOrderFlowTestIds } from '../PredictOrderFlow/internal/PredictOrderFlow.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import { PredictPortfolioScreenTestIds } from '../PredictPortfolio/PredictPortfolioScreen.testIds';
import { PredictSearchScreenTestIds } from '../PredictSearch/PredictSearchScreen.testIds';
import { PredictError, PredictErrorCode } from '../../errors';
import {
  KALSHI_STATIC_VENUE_CATALOG,
  POLYMARKET_STATIC_VENUE_CATALOG,
} from '../../config/venueCatalogs';
import type {
  PredictEntityId,
  PredictFeedId,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';
import {
  answerPredictNextCatalog,
  configurePredictNextCatalog,
  configurePredictNextFeeds,
  expectPredictNextGameCard,
  makePredictNextEvent,
  messengerCall,
  mockPredictNextMessenger,
  ncaaEvents,
  nflEvents,
  PREDICT_NEXT_FEED_IDS,
  publishPredictNextGameLiveUpdate,
} from '../../../../../../tests/component-view/fixtures/predictNext';

const { nflGames: NFL_GAMES_FEED_ID, ncaaGames: NCAA_GAMES_FEED_ID } =
  PREDICT_NEXT_FEED_IDS;

describe('PredictHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configurePredictNextFeeds();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    onlineManager.setOnline(true);
  });

  it('loads and rounds the available Balance without blocking Feeds', async () => {
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT),
    ).toHaveTextContent('$123.13');
    expect(view.getByText('Available balance')).toBeOnTheScreen();
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('renders the scroll-linked compact header title', async () => {
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    fireEvent(view.getByTestId(PredictHomeTestIds.TITLE_SECTION), 'layout', {
      nativeEvent: { layout: { height: 48 } },
    });

    expect(view.getByTestId(PredictHomeTestIds.HEADER_TITLE)).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.TITLE_SECTION),
    ).toBeOnTheScreen();
    expect(view.getAllByText('Predictions').length).toBeGreaterThan(1);
  });

  it('keeps the compact header title and feed mounted after scrolling past the title section', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    fireEvent.scroll(view.getByTestId(PredictHomeTestIds.SCROLL), {
      nativeEvent: { contentOffset: { y: 1000 } },
    });

    expect(view.getByTestId(PredictHomeTestIds.HEADER_TITLE)).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('opens the Portfolio screen from the Positions action', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    fireEvent.press(view.getByTestId(PredictHomeTestIds.POSITIONS));

    expect(
      await view.findByTestId(PredictPortfolioScreenTestIds.CONTAINER),
    ).toBeOnTheScreen();

    fireEvent.press(view.getByTestId(PredictPortfolioScreenTestIds.BACK));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });

  it('offers no funding actions while none is implemented', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    expect(view.getByTestId(PredictHomeTestIds.POSITIONS)).toBeOnTheScreen();
    expect(view.queryByText('Add Funds')).not.toBeOnTheScreen();
    expect(view.queryByText('Withdraw')).not.toBeOnTheScreen();
  });

  it('masks Balance when privacy mode is enabled', async () => {
    const view = renderPredictNext(true);

    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
    expect(view.queryByText('$123.13')).not.toBeOnTheScreen();
    expect(view.getByText('Available balance')).toBeOnTheScreen();
  });

  it('keeps Balance failure isolated and retries it', async () => {
    let balanceFails = true;
    mockPredictNextMessenger((action: string, _venueId: string, id: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return balanceFails
          ? Promise.reject(new Error('Balance failed'))
          : Promise.resolve({
              venueId: 'kalshi',
              currency: 'USD',
              available: '5',
            });
      }
      if (action === 'PredictMarketDataService:getFeed') {
        return Promise.resolve({
          venueId: 'kalshi',
          id,
          title: 'Games',
          events: id === NFL_GAMES_FEED_ID ? nflEvents : ncaaEvents,
        });
      }
      return Promise.resolve(undefined);
    });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.BALANCE_ERROR),
    ).toBeOnTheScreen();
    expect(view.getByText('Balance unavailable')).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();

    balanceFails = false;
    fireEvent.press(view.getByTestId(PredictHomeTestIds.BALANCE_RETRY));
    expect(
      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT),
    ).toHaveTextContent('$5.00');
  });

  it('shows region copy without a retry when Balance is geo-blocked', async () => {
    const callFixture = messengerCall.getMockImplementation();
    mockPredictNextMessenger((action: string, ...params: unknown[]) =>
      action === 'PredictPortfolioService:getBalance'
        ? Promise.reject(PredictError.from(PredictErrorCode.GEO_BLOCKED))
        : callFixture?.(action, ...params),
    );
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.BALANCE_GEO_BLOCKED),
    ).toHaveTextContent('Not available in your region');
    expect(view.queryByText('Balance unavailable')).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.BALANCE_RETRY),
    ).not.toBeOnTheScreen();
  });

  it('uses the 60-second Balance focus revalidation window', async () => {
    const now = jest.spyOn(Date, 'now').mockReturnValue(1_000);
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
    messengerCall.mockClear();

    now.mockReturnValue(60_999);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictPortfolioService:getBalance',
      'kalshi',
    );

    mockPredictNextMessenger((action: string, _venueId: string, id: string) => {
      if (action === 'PredictPortfolioService:getBalance') {
        return Promise.reject(new Error('Balance refetch failed'));
      }
      if (action === 'PredictMarketDataService:getFeed') {
        return Promise.resolve({
          venueId: 'kalshi',
          id,
          title: 'Games',
          events: id === NFL_GAMES_FEED_ID ? nflEvents : ncaaEvents,
        });
      }
      return Promise.resolve(undefined);
    });
    now.mockReturnValue(61_001);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictPortfolioService:getBalance',
        'kalshi',
      ),
    );
    expect(
      view.getByTestId(PredictHomeTestIds.BALANCE_AMOUNT),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.BALANCE_ERROR),
    ).not.toBeOnTheScreen();
  });

  it('keeps the Balance loading state visible while the first request is offline', async () => {
    onlineManager.setOnline(false);

    const view = renderPredictNext();

    await waitFor(() =>
      expect(
        view.getByTestId(PredictHomeTestIds.BALANCE_LOADING),
      ).toBeOnTheScreen(),
    );
  });

  it('loads the first two backend-ordered Games for both previews', async () => {
    configurePredictNextFeeds({
      nfl: [...nflEvents, makePredictNextEvent('nfl-3', 'Hidden NFL Game')],
      ncaa: [
        ...ncaaEvents,
        makePredictNextEvent('ncaa-3', 'Hidden College Game'),
      ],
    });
    const view = renderPredictNext();

    await waitFor(() => {
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        'sports-football-nfl-games',
        { limit: 2 },
      );
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        'sports-football-ncaa-games',
        { limit: 2 },
      );
    });

    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-2'));

    const nflSection = view.getByTestId(
      PredictHomeTestIds.section(NFL_FEED_SCREEN_ID),
    );
    expectPredictNextGameCard(nflSection, 'nfl-1', {
      away: 'Packers',
      home: 'Steelers',
      awayScore: '17',
      homeScore: '21',
      awayQuote: 'PAC · 41¢',
      homeQuote: 'STE · 59¢',
    });
    expectPredictNextGameCard(nflSection, 'nfl-2', {
      away: 'Panthers',
      home: 'Cardinals',
      awayScore: '10',
      homeScore: '7',
      awayQuote: 'PAN · 36¢',
      homeQuote: 'CAR · 64¢',
    });
    expect(
      within(nflSection).queryByText('Hidden NFL Game'),
    ).not.toBeOnTheScreen();
    expect(
      within(nflSection).queryByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-1'),
      ),
    ).not.toBeOnTheScreen();

    const ncaaSection = view.getByTestId(
      PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID),
    );
    expectPredictNextGameCard(ncaaSection, 'ncaa-1', {
      away: 'Pittsburgh',
      home: 'Miami',
      awayScore: '24',
      homeScore: '31',
      awayQuote: 'PIT · 47¢',
      homeQuote: 'MIA · 53¢',
    });
    expectPredictNextGameCard(ncaaSection, 'ncaa-2', {
      away: 'Georgia',
      home: 'Florida',
      awayScore: '3',
      homeScore: '0',
      awayQuote: 'GEO · 55¢',
      homeQuote: 'FLO · 45¢',
    });
    expect(
      within(ncaaSection).queryByText('Hidden College Game'),
    ).not.toBeOnTheScreen();
    expect(
      within(ncaaSection).queryByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      ),
    ).not.toBeOnTheScreen();
  });

  it('renders live game updates received for a Home Event', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
    const nflSection = await view.findByTestId(
      PredictHomeTestIds.section(NFL_FEED_SCREEN_ID),
    );

    act(() => {
      publishPredictNextGameLiveUpdate({
        venueId: 'kalshi' as PredictVenueId,
        eventId: 'nfl-1' as PredictEntityId,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '28', home: '24' },
        period: 'Q4',
        clock: '01:12',
        observedAt: '2026-09-11T03:00:00.000Z' as PredictTimestamp,
      });
    });

    expect(within(nflSection).getByText('28')).toBeOnTheScreen();
    expect(within(nflSection).getByText('24')).toBeOnTheScreen();
    expect(within(nflSection).getByText('Q4 · 01:12')).toBeOnTheScreen();
  });

  describe('live-data subscriptions', () => {
    /** Home cards ask the live-data service for card-visible Markets only. */
    const CARD_SCOPE = { marketScope: 'card' };
    const liveDataCalls = () =>
      messengerCall.mock.calls.filter(([action]: [string]) =>
        action.startsWith('PredictLiveDataService:'),
      );
    const eventIds = (events: readonly { id: PredictEntityId }[]) =>
      events.map((event) => event.id);

    const layoutHome = (
      view: ReturnType<typeof renderPredictNext>,
      { nflY, ncaaY, viewportHeight }: Record<string, number>,
    ) => {
      fireEvent(view.getByTestId(PredictHomeTestIds.SCROLL), 'layout', {
        nativeEvent: { layout: { height: viewportHeight } },
      });
      fireEvent(
        view.getByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
        'layout',
        { nativeEvent: { layout: { y: nflY, height: 300 } } },
      );
      fireEvent(
        view.getByTestId(PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID)),
        'layout',
        { nativeEvent: { layout: { y: ncaaY, height: 300 } } },
      );
    };

    const watchedEventIds = () =>
      liveDataCalls()
        .filter(([action]) => action === 'PredictLiveDataService:watchEvents')
        .flatMap(([, , ids]: [string, string, PredictEntityId[]]) => ids);

    // Reanimated's Jest mock runs the scroll reaction through the
    // microtask/frame queues, so let them drain before reading the result.
    const scrollHome = (
      view: ReturnType<typeof renderPredictNext>,
      y: number,
    ) =>
      act(async () => {
        fireEvent.scroll(view.getByTestId(PredictHomeTestIds.SCROLL), {
          nativeEvent: { contentOffset: { y } },
        });
        await new Promise<void>((resolve) => setTimeout(resolve, 0));
      });

    it('watches every preview Event once both sections are loaded', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));

      // Each section resolves its own preview Feed, so the service may hear
      // the two watches in either order. The ids are the contract, not the
      // arrival order; sorting keeps extra or duplicate watches failing.
      expect(watchedEventIds().sort()).toEqual(
        [...eventIds(nflEvents), ...eventIds(ncaaEvents)].sort(),
      );
      expect(
        liveDataCalls().filter(
          ([action]) => action === 'PredictLiveDataService:unwatchEvents',
        ),
      ).toEqual([]);
    });

    it('releases a section that is fully below the viewport and rewatches it when scrolled in', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      messengerCall.mockClear();

      layoutHome(view, { nflY: 200, ncaaY: 900, viewportHeight: 800 });

      expect(liveDataCalls()).toEqual([
        [
          'PredictLiveDataService:unwatchEvents',
          'kalshi',
          eventIds(ncaaEvents),
          CARD_SCOPE,
        ],
      ]);

      messengerCall.mockClear();
      await scrollHome(view, 600);

      expect(liveDataCalls()).toEqual([
        [
          'PredictLiveDataService:watchEvents',
          'kalshi',
          eventIds(ncaaEvents),
          CARD_SCOPE,
        ],
        [
          'PredictLiveDataService:unwatchEvents',
          'kalshi',
          eventIds(nflEvents),
          CARD_SCOPE,
        ],
      ]);
    });

    it('keeps a section watched while any part of it overlaps the viewport', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      messengerCall.mockClear();

      layoutHome(view, { nflY: 200, ncaaY: 700, viewportHeight: 800 });
      await scrollHome(view, 450);

      expect(liveDataCalls()).toEqual([]);
    });

    it('releases every Home watch while an Event Screen is on top and rewatches on return', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      messengerCall.mockClear();

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      );
      await view.findByTestId(PredictEventScreenTestIds.VIEW);

      expect(messengerCall).toHaveBeenCalledWith(
        'PredictLiveDataService:unwatchEvents',
        'kalshi',
        [...eventIds(nflEvents), ...eventIds(ncaaEvents)],
        CARD_SCOPE,
      );

      messengerCall.mockClear();
      fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));
      await waitFor(() =>
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictLiveDataService:watchEvents',
          'kalshi',
          [...eventIds(nflEvents), ...eventIds(ncaaEvents)],
          CARD_SCOPE,
        ),
      );
    });
  });

  it.each([
    {
      feedScreenId: NFL_FEED_SCREEN_ID,
      feedId: NFL_GAMES_FEED_ID,
      selectionLabel: 'NFL',
    },
    {
      feedScreenId: NCAA_FEED_SCREEN_ID,
      feedId: NCAA_GAMES_FEED_ID,
      selectionLabel: 'NCAAF',
    },
  ])(
    'opens the $selectionLabel Feed Screen and returns without refetching previews',
    async ({ feedScreenId, feedId, selectionLabel }) => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
      messengerCall.mockClear();

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.sectionHeader(feedScreenId)),
      );

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.VIEW),
      ).toBeOnTheScreen();
      expect(view.getByText('Sports')).toBeOnTheScreen();
      expect(view.getAllByText(selectionLabel)[0]).toBeOnTheScreen();

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        feedId,
        { limit: 20 },
      );
      expect(messengerCall).not.toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        feedId,
        { limit: 2 },
      );
    },
  );

  it('renders a successful NCAAF preview while NFL is still loading', async () => {
    let resolveNfl: (value: unknown) => void = () => undefined;
    mockPredictNextMessenger(
      (action: string, _venueId: string, feedId: PredictFeedId) => {
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        if (feedId === 'sports-football-nfl-games') {
          return new Promise((resolve) => {
            resolveNfl = resolve;
          });
        }
        return Promise.resolve({
          venueId: 'kalshi',
          id: feedId,
          title: 'NCAAF Games',
          events: ncaaEvents,
        });
      },
    );
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.sectionLoading(NFL_FEED_SCREEN_ID)),
    ).toBeOnTheScreen();

    await act(async () => {
      resolveNfl({
        venueId: 'kalshi',
        id: 'sports-football-nfl-games',
        title: 'NFL Games',
        events: nflEvents,
      });
    });
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('keeps an errored NFL preview independent from a successful NCAAF preview', async () => {
    configurePredictNextFeeds({ nfl: new Error('NFL failed') });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionError(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.sectionError(NCAA_FEED_SCREEN_ID)),
    ).not.toBeOnTheScreen();

    configurePredictNextFeeds();
    await act(async () => {
      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.sectionRetry(NFL_FEED_SCREEN_ID)),
      );
    });
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
  });

  it('keeps cached NFL Games visible when a later refetch fails', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));
    configurePredictNextFeeds({ nfl: new Error('NFL refetch failed') });

    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(
        messengerCall.mock.calls.filter(
          ([action, , feedId]) =>
            action === 'PredictMarketDataService:getFeed' &&
            feedId === 'sports-football-nfl-games',
        ),
      ).toHaveLength(2),
    );
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.sectionError(NFL_FEED_SCREEN_ID)),
    ).not.toBeOnTheScreen();
  });

  it('keeps an empty NFL preview independent from a successful NCAAF preview', async () => {
    configurePredictNextFeeds({ nfl: [] });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionEmpty(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
  });

  it('returns to Home after opening the immutable Event from a card', async () => {
    mockPredictNextMessenger((action: string, _venueId: string, id: string) => {
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(nflEvents.find((event) => event.id === id));
      }
      if (action === 'PredictPortfolioService:getPositions') {
        return Promise.resolve({ venueId: 'kalshi', positions: [] });
      }
      return Promise.resolve({
        venueId: 'kalshi',
        id,
        title: 'Games',
        events: id === 'sports-football-nfl-games' ? nflEvents : ncaaEvents,
      });
    });
    const view = renderPredictNext();

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'nfl-1'),
      ),
    );

    expect(
      await view.findByTestId(PredictEventScreenTestIds.GAME_HEADER),
    ).toBeOnTheScreen();
    expect(
      await view.findByTestId(EventMarketListTestIds.MARKETS_TAB),
    ).toBeOnTheScreen();
    expect(messengerCall.mock.calls).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          'PredictMarketDataService:getEvent',
          'kalshi',
          'nfl-1',
        ]),
      ]),
    );

    fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));

    expect(await view.findByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
  });

  it('opens the Order flow when a Home game quote is pressed', async () => {
    const view = renderPredictNext();
    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'nfl-1'),
    );

    fireEvent.press(
      within(card).getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
    );

    // The Order flow opens in place; the Home screen does not navigate.
    expect(view.getByTestId(PredictOrderFlowTestIds.SHEET)).toBeOnTheScreen();
    expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.VIEW),
    ).not.toBeOnTheScreen();
  });

  describe('capability-gated Feed sections', () => {
    const feedCalls = () =>
      messengerCall.mock.calls.filter(
        ([action]) => action === 'PredictMarketDataService:getFeed',
      );
    const buyButtons = (view: ReturnType<typeof renderPredictNext>) =>
      view.queryAllByLabelText(/, buy$/);

    it('renders every section the Venue supports, with search and buy', async () => {
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID)),
      ).toBeOnTheScreen();
      expect(view.getByTestId(PredictHomeTestIds.SEARCH)).toBeOnTheScreen();
      expect(buyButtons(view).length).toBeGreaterThan(0);
      expect(
        view.queryByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
      ).not.toBeOnTheScreen();
    });

    it('omits a section whose Feed key the Venue lacks and never reads its Feed', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: { 'nfl-games': KALSHI_STATIC_VENUE_CATALOG.feeds['nfl-games'] },
      });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(feedCalls().map(([, , feedId]) => feedId)).not.toContain(
        NCAA_GAMES_FEED_ID,
      );
    });

    it('shows a placeholder and reads no Feed while capabilities load', async () => {
      configurePredictNextCatalog('pending');
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_LOADING),
      ).toBeOnTheScreen();
      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
      expect(feedCalls()).toHaveLength(0);
    });

    it('shows a retryable failure and renders the sections after recovery', async () => {
      configurePredictNextCatalog(
        PredictError.from(PredictErrorCode.SERVICE_DEGRADED),
      );
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_ERROR),
      ).toHaveTextContent('Markets couldn’t be loaded.', { exact: false });
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(feedCalls()).toHaveLength(0);

      configurePredictNextCatalog(KALSHI_STATIC_VENUE_CATALOG);
      fireEvent.press(view.getByTestId(PredictHomeTestIds.SECTIONS_RETRY));

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SECTIONS_ERROR),
      ).not.toBeOnTheScreen();
    });

    it.each([
      ['a malformed catalog', { venueId: 'kalshi', actions: 'buy' }],
      ["another Venue's catalog", POLYMARKET_STATIC_VENUE_CATALOG],
    ])('enables nothing for %s', async (_name, catalog) => {
      configurePredictNextCatalog(catalog);
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
      ).toHaveTextContent('No markets are available right now.');
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
      expect(view.getByTestId(PredictHomeTestIds.POSITIONS)).toBeOnTheScreen();
      expect(feedCalls()).toHaveLength(0);
    });

    it('enables nothing when the catalog read returns no catalog', async () => {
      configurePredictNextCatalog(undefined);
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.SECTIONS_ERROR),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
      expect(feedCalls()).toHaveLength(0);
    });

    it('shows prices without buy buttons when the Venue does not support buy', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        actions: ['sell'],
        searchSupported: false,
      });
      const view = renderPredictNext();

      const card = await view.findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      );
      expect(
        within(card).getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
      ).toBeOnTheScreen();
      expect(buyButtons(view)).toHaveLength(0);
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
    });
  });

  describe('venue-generic Home', () => {
    const calls = (action: string) =>
      messengerCall.mock.calls.filter(([name]) => name === action);

    it('renders the sections and Feeds of an arbitrary Venue descriptor', async () => {
      // A feed set Kalshi's catalog does not have: college football only,
      // under Feed IDs of its own, plus a key Home has no section for.
      const testFeedId = 'test-college-games' as PredictFeedId;
      configurePredictNextCatalog({
        venueId: 'kalshi',
        actions: ['buy'],
        feeds: {
          'college-football-games': testFeedId,
          trending: 'test-trending',
        },
        searchSupported: false,
      });
      const testEvents = [
        makePredictNextEvent('test-1', 'Test Game One'),
        makePredictNextEvent('test-2', 'Test Game Two'),
      ];
      mockPredictNextMessenger((action: string, venueId: string) => {
        if (action === 'PredictMarketDataService:getFeed') {
          return Promise.resolve({
            venueId,
            id: testFeedId,
            title: 'Test Games',
            events: testEvents,
          });
        }
        if (action === 'PredictPortfolioService:getBalance') {
          return Promise.resolve({ venueId, currency: 'USD', available: '1' });
        }
        return Promise.resolve(undefined);
      });
      const view = renderPredictNext();

      const section = await view.findByTestId(
        PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID),
      );
      expect(
        await within(section).findByTestId(
          PredictHomeTestIds.event('kalshi', 'test-1'),
        ),
      ).toBeOnTheScreen();
      expect(
        within(section).getByTestId(
          PredictHomeTestIds.event('kalshi', 'test-2'),
        ),
      ).toBeOnTheScreen();
      expect(within(section).getByText('NCAAF')).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
      expect(
        calls('PredictMarketDataService:getFeed').map(
          ([, venueId, feedId, params]) => [venueId, feedId, params],
        ),
      ).toEqual([['kalshi', testFeedId, { limit: 2 }]]);

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.sectionHeader(NCAA_FEED_SCREEN_ID)),
      );

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.VIEW),
      ).toBeOnTheScreen();
      await waitFor(() =>
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictMarketDataService:getFeed',
          'kalshi',
          testFeedId,
          { limit: 20 },
        ),
      );
    });

    describe('for a Venue other than Kalshi', () => {
      // Polymarket's bundled descriptor: search, but none of Home's Feed keys.
      const venueId = 'polymarket' as PredictVenueId;

      beforeEach(() => {
        mockPredictNextMessenger((action: string, requestedVenueId: string) => {
          if (action === 'PredictPortfolioService:getBalance') {
            return Promise.resolve({
              venueId: requestedVenueId,
              currency: 'USD',
              available: '42',
            });
          }
          if (action === 'PredictPortfolioService:getPositions') {
            return Promise.resolve({
              venueId: requestedVenueId,
              positions: [],
            });
          }
          if (action === 'PredictPortfolioService:getActivity') {
            return Promise.resolve({
              venueId: requestedVenueId,
              activity: [],
            });
          }
          if (action === 'PredictMarketDataService:searchEvents') {
            return Promise.resolve({ venueId: requestedVenueId, events: [] });
          }
          return Promise.resolve(undefined);
        });
      });

      it('reads everything for the Active Venue and never for Kalshi', async () => {
        const view = renderPredictNext(false, { venueId });

        expect(
          await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT),
        ).toHaveTextContent('$42.00');
        expect(
          await view.findByTestId(PredictHomeTestIds.SECTIONS_UNAVAILABLE),
        ).toBeOnTheScreen();
        expect(view.getByTestId(PredictHomeTestIds.SEARCH)).toBeOnTheScreen();
        expect(calls('PredictPortfolioService:getBalance')).toEqual([
          ['PredictPortfolioService:getBalance', venueId],
        ]);
        expect(calls('PredictMarketDataService:getFeed')).toHaveLength(0);
        expect(
          messengerCall.mock.calls.filter(([, id]) => id === 'kalshi'),
        ).toEqual([]);
      });

      it('opens Portfolio for the Active Venue', async () => {
        const view = renderPredictNext(false, { venueId });
        await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

        fireEvent.press(view.getByTestId(PredictHomeTestIds.POSITIONS));

        expect(
          await view.findByTestId(PredictPortfolioScreenTestIds.CONTAINER),
        ).toBeOnTheScreen();
        await waitFor(() =>
          expect(
            calls('PredictPortfolioService:getPositions').map(([, id]) => id),
          ).toContain(venueId),
        );
      });

      it('opens search for the Active Venue', async () => {
        const view = renderPredictNext(false, { venueId });

        fireEvent.press(await view.findByTestId(PredictHomeTestIds.SEARCH));
        fireEvent.changeText(
          await view.findByTestId(PredictSearchScreenTestIds.INPUT),
          'chiefs',
        );

        await waitFor(() =>
          expect(messengerCall).toHaveBeenCalledWith(
            'PredictMarketDataService:searchEvents',
            venueId,
            expect.objectContaining({ q: 'chiefs' }),
          ),
        );
      });
    });
  });
});
