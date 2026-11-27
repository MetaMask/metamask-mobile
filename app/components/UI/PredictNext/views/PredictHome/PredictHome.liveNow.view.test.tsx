import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import type { Query, QueryClient } from '@tanstack/react-query';
import { createComponentViewQueryClient } from '../../../../../../tests/component-view/render';
// eslint-disable-next-line import-x/no-namespace -- reach the mock's test helpers
import * as NetInfoModule from '@react-native-community/netinfo';
import type NetInfoMock from '../../../../../__mocks__/@react-native-community/netinfo';
import { strings } from '../../../../../../locales/i18n';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import { KALSHI_STATIC_VENUE_CATALOG } from '../../contracts/v1/fixtures/kalshiVenueCatalog';
import {
  LIVE_NOW_POLL_MS,
  LIVE_NOW_SLOW_POLL_MS,
} from './internal/useLiveNowPollInterval';
import {
  configurePredictNextCatalog,
  configurePredictNextFeeds,
  makePredictNextGameEvent,
  messengerCall,
} from '../../../../../../tests/component-view/fixtures/predictNext';

const netInfoMock = NetInfoModule.default as unknown as typeof NetInfoMock;

/** The fixture serves `ncaa` for any Feed it does not know, Live now's too. */
const LIVE_GAMES_FEED_ID = 'sports-live-games';

const liveGame = (n: number) =>
  makePredictNextGameEvent(`live-${n}`, `Away ${n}`, `Home ${n}`, 'NBA');
const LIVE_GAMES = [1, 2, 3, 4, 5, 6].map(liveGame);

/** Serves Kalshi's catalog with PRED-1609's carousel, given `section`
 * fields, above the Categories. */
const configureLiveNow = (section: Record<string, unknown> = {}) =>
  configurePredictNextCatalog({
    ...KALSHI_STATIC_VENUE_CATALOG,
    feeds: {
      ...KALSHI_STATIC_VENUE_CATALOG.feeds,
      'live-games': LIVE_GAMES_FEED_ID,
    },
    home: {
      sections: [
        {
          kind: 'trending',
          title: 'Live now',
          sources: ['live-games'],
          limit: 5,
          screen: 'sports',
          ...section,
        },
        { kind: 'categories' },
      ],
    },
  });

/** Serves `liveGames` on Live now's Feed, keeping the carousel's catalog. */
const serveLiveGames = (
  liveGames: readonly ReturnType<typeof liveGame>[],
  section?: Record<string, unknown>,
) => {
  configurePredictNextFeeds({ ncaa: liveGames });
  configureLiveNow(section);
};

const liveNowReads = () =>
  messengerCall.mock.calls.filter(
    ([action, , feedId]) =>
      action === 'PredictMarketDataService:getFeed' &&
      feedId === LIVE_GAMES_FEED_ID,
  ).length;

const carouselEventIds = (view: ReturnType<typeof renderPredictNext>) =>
  within(view.getByTestId(PredictHomeTestIds.HOME_TRENDING_CAROUSEL))
    .getAllByTestId(/^predict-next-event-kalshi-/)
    .map((card) =>
      String(card.props.testID).replace('predict-next-event-kalshi-', ''),
    );

const isLiveNowRead = (query: Query) =>
  query.queryKey.includes(LIVE_GAMES_FEED_ID);

/** The poll period Home gives React Query for the Live now read. */
const liveNowPollMs = (queryClient: QueryClient) =>
  queryClient
    .getQueryCache()
    .findAll({ predicate: isLiveNowRead })
    .flatMap((query) => query.observers)
    .map((observer) => observer.options.refetchInterval ?? false)[0];

describe('PredictHome Live now carousel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    netInfoMock.__setMockNetInfo({ type: 'wifi', isInternetReachable: true });
    serveLiveGames(LIVE_GAMES);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    netInfoMock.__resetMockNetInfo();
  });

  describe('title', () => {
    it('reads the Live now copy for the catalog title "Live now"', async () => {
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
      ).toHaveTextContent(strings('predict_next.home_feed.live_now'));
    });

    it('reads "Trending" when the catalog gives no title', async () => {
      configureLiveNow({ title: undefined });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
      ).toHaveTextContent(strings('predict_next.home_feed.trending'));
    });

    it('shows any other catalog title as served', async () => {
      configureLiveNow({ title: 'Games on now' });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
      ).toHaveTextContent('Games on now');
    });
  });

  describe('card count', () => {
    it("shows the section's limit of cards, in the Feed's order", async () => {
      configureLiveNow({ limit: 3 });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      expect(carouselEventIds(view)).toEqual(['live-1', 'live-2', 'live-3']);
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        LIVE_GAMES_FEED_ID,
        { limit: 3 },
      );
    });

    it('shows five cards without a limit', async () => {
      configureLiveNow({ limit: undefined });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      expect(carouselEventIds(view)).toEqual([
        'live-1',
        'live-2',
        'live-3',
        'live-4',
        'live-5',
      ]);
    });
  });

  it('renders nothing with no live Game', async () => {
    serveLiveGames([]);
    const view = renderPredictNext();

    await view.findByTestId(PredictHomeTestIds.CATEGORIES);
    await waitFor(() => expect(liveNowReads()).toBe(1));

    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
    ).not.toBeOnTheScreen();
  });

  describe('refetch', () => {
    // React Query runs the interval; these tests read the period Home gives
    // it, and stand in for a tick with a refetch.
    it('reads Live now again so a finished Game leaves and a new one joins', async () => {
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));
      expect(liveNowPollMs(queryClient)).toBe(LIVE_NOW_POLL_MS);

      serveLiveGames([liveGame(2), liveGame(7)]);
      await act(() => queryClient.refetchQueries({ predicate: isLiveNowRead }));

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-7'));
      expect(liveNowReads()).toBe(2);
      expect(carouselEventIds(view)).toEqual(['live-2', 'live-7']);
    });

    it('removes the carousel once the last live Game ends', async () => {
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      serveLiveGames([]);
      await act(() => queryClient.refetchQueries({ predicate: isLiveNowRead }));

      await waitFor(() =>
        expect(
          view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
        ).not.toBeOnTheScreen(),
      );
      expect(view.getByTestId(PredictHomeTestIds.CATEGORIES)).toBeOnTheScreen();
    });

    it('stops while another screen covers Home and resumes back on Home', async () => {
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
      );
      await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      await waitFor(() => expect(liveNowPollMs(queryClient)).toBe(false));

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));
      await waitFor(() =>
        expect(liveNowPollMs(queryClient)).toBe(LIVE_NOW_POLL_MS),
      );
    });

    it('polls every five minutes on a slow cellular link', async () => {
      netInfoMock.__setMockNetInfo({
        type: 'cellular',
        isInternetReachable: true,
        details: { cellularGeneration: '3g' },
      });
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      expect(liveNowPollMs(queryClient)).toBe(LIVE_NOW_SLOW_POLL_MS);
    });

    it('polls every minute when the network tier is unknown', async () => {
      netInfoMock.__setMockNetInfo({ type: 'vpn', isInternetReachable: true });
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      expect(liveNowPollMs(queryClient)).toBe(LIVE_NOW_POLL_MS);
    });

    it('never polls without a network', async () => {
      netInfoMock.__setMockNetInfo({
        type: 'none',
        isInternetReachable: false,
      });
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'live-1'));

      expect(liveNowPollMs(queryClient)).toBe(false);
    });

    it('polls only the Live now read', async () => {
      configurePredictNextFeeds({ ncaa: LIVE_GAMES });
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: {
          ...KALSHI_STATIC_VENUE_CATALOG.feeds,
          'live-games': LIVE_GAMES_FEED_ID,
        },
        home: {
          sections: [
            { kind: 'trending', title: 'Live now', sources: ['live-games'] },
            {
              kind: 'feed-preview',
              id: 'politics',
              title: 'Politics',
              feed: 'politics-trump',
              screen: 'politics',
            },
          ],
        },
      });
      const queryClient = createComponentViewQueryClient();
      const view = renderPredictNext(false, { queryClient });
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        queryClient
          .getQueryCache()
          .findAll({ predicate: (query) => !isLiveNowRead(query) })
          .flatMap((query) => query.observers)
          .map((observer) => observer.options.refetchInterval ?? false),
      ).not.toContain(LIVE_NOW_POLL_MS);
    });
  });
});
