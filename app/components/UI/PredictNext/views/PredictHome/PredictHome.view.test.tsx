import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import { getRouteProbeTestId } from '../../../../../../tests/component-view/render';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import Routes from '../../../../../constants/navigation/Routes';
import { formatGameStartShort } from '../../events/game';
import { KalshiDebugTestIds } from '../../onboarding/KalshiDebugPanel';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { FLOATING_HEADER_FADE_TEST_ID } from '../../../../../component-library/components-temp/HeaderGlass/HeaderGlass';
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
  PredictEvent,
  PredictFeedId,
  PredictTimestamp,
  PredictVenueId,
} from '../../types';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
  POLITICS_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';
import {
  configurePredictNextCatalog,
  configurePredictNextFeeds,
  expectPredictNextGameCard,
  makePredictNextGameEvent,
  messengerCall,
  mockPredictNextMessenger,
  ncaaEvents,
  nflEvents,
  politicsEvents,
  PREDICT_NEXT_FEED_IDS,
  publishPredictNextGameLiveUpdate,
} from '../../../../../../tests/component-view/fixtures/predictNext';

const {
  nflGames: NFL_GAMES_FEED_ID,
  ncaaGames: NCAA_GAMES_FEED_ID,
  politicsTrump: POLITICS_TRUMP_FEED_ID,
} = PREDICT_NEXT_FEED_IDS;

/** The pagination dots and Team logos are hidden from screen readers. */
const HIDDEN = { includeHiddenElements: true };

const STARTS_AT = '2026-11-15T18:00:00Z';
const scheduledGame = (
  id: string,
  away: string,
  home: string,
  competition: string,
  askPrices?: { away: string; home: string },
) =>
  makePredictNextGameEvent(id, away, home, competition, {
    status: 'scheduled',
    startsAt: STARTS_AT,
    askPrices,
  });
/**
 * Scheduled NFL Games after the two live fixture Games. The NFL read keeps
 * six, so `nfl-7` never shows.
 */
const MORE_NFL_EVENTS = [
  scheduledGame('nfl-3', 'Bills', 'Rams', 'NFL'),
  scheduledGame('nfl-4', 'Chiefs', 'Broncos', 'NFL', {
    away: '0.55',
    home: '0.45',
  }),
  scheduledGame('nfl-5', 'Bears', 'Lions', 'NFL'),
  scheduledGame('nfl-6', 'Jets', 'Giants', 'NFL'),
  scheduledGame('nfl-7', 'Eagles', 'Cowboys', 'NFL'),
];
const MORE_NCAA_EVENTS = [scheduledGame('ncaa-3', 'Clemson', 'Duke', 'NCAAF')];
/** Enough Games for both rows: Trending takes five, Sports the next three. */
const configureFullHomeFeeds = () =>
  configurePredictNextFeeds({
    nfl: [...nflEvents, ...MORE_NFL_EVENTS],
    ncaa: [...ncaaEvents, ...MORE_NCAA_EVENTS],
  });
const TRENDING_EVENT_IDS = ['nfl-1', 'nfl-2', 'ncaa-1', 'ncaa-2', 'nfl-3'];
const SPORTS_EVENT_IDS = ['nfl-4', 'nfl-5', 'nfl-6'];

/** The Event ids of the cards in a row, in display order. */
const rowEventIds = (row: Parameters<typeof within>[0]) =>
  within(row)
    .getAllByTestId(/^predict-next-event-kalshi-/)
    .map((card) =>
      String(card.props.testID).replace('predict-next-event-kalshi-', ''),
    );
const eventIdsOf = (events: readonly PredictEvent[]) =>
  events.map((event) => event.id);

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

  it('shows the user debug control on a development build with Kalshi on', async () => {
    const view = renderPredictNext();

    expect(await view.findByTestId(KalshiDebugTestIds.OPEN)).toBeOnTheScreen();
  });

  it('hides the user debug control when Kalshi authentication is off', async () => {
    const view = renderPredictNext(false, {
      remoteFeatureFlags: {
        predictConfig: {
          enabled: true,
          venues: {
            polymarket: { enabled: false },
            kalshi: { enabled: false },
          },
          venueSelection: { enabled: false },
        },
      },
    });

    await view.findByTestId(PredictHomeTestIds.HOME);

    expect(view.queryByTestId(KalshiDebugTestIds.OPEN)).not.toBeOnTheScreen();
  });

  it('hides the user debug control on a release build', async () => {
    const devGlobal = globalThis as { __DEV__?: boolean };
    const originalDev = devGlobal.__DEV__;
    devGlobal.__DEV__ = false;

    try {
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.HOME);

      expect(view.queryByTestId(KalshiDebugTestIds.OPEN)).not.toBeOnTheScreen();
    } finally {
      devGlobal.__DEV__ = originalDev;
    }
  });

  it('floats the header over the content when the Predict brand refresh is on', async () => {
    const view = renderPredictNext(false, {
      remoteFeatureFlags: {
        predictBrandRefresh: { enabled: true, minimumVersion: '0.0.0' },
      },
    });
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    expect(view.getByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.SCROLL).props.contentContainerStyle
        .paddingTop,
    ).toBeGreaterThan(0);

    fireEvent.press(view.getByTestId(PredictHomeTestIds.SEARCH));

    expect(
      await view.findByTestId(PredictSearchScreenTestIds.VIEW),
    ).toBeOnTheScreen();
  });

  it('keeps the solid header when the Predict brand refresh is off', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

    expect(view.queryByTestId(FLOATING_HEADER_FADE_TEST_ID)).toBeNull();
    expect(
      view.getByTestId(PredictHomeTestIds.SCROLL).props.contentContainerStyle
        .paddingTop,
    ).toBe(0);
  });

  it('keeps the compact header title and feed mounted after scrolling past the title section', async () => {
    const view = renderPredictNext();
    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
    // Trending shows its cards once every Home read has settled.
    await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1'));

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
    // The Feeds still load. Trending shows them once every read settles.
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
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

  describe('Trending and Sports rows', () => {
    beforeEach(() => {
      configureFullHomeFeeds();
    });

    it('reads six NFL, four NCAAF and two Politics Events', async () => {
      renderPredictNext();

      await waitFor(() => {
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictMarketDataService:getFeed',
          'kalshi',
          NFL_GAMES_FEED_ID,
          { limit: 6 },
        );
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictMarketDataService:getFeed',
          'kalshi',
          NCAA_GAMES_FEED_ID,
          { limit: 4 },
        );
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictMarketDataService:getFeed',
          'kalshi',
          POLITICS_TRUMP_FEED_ID,
          { limit: 2 },
        );
      });
    });

    it('fills Trending with live Games first, two per read, then up to five', async () => {
      const view = renderPredictNext();

      const trending = await view.findByTestId(
        PredictHomeTestIds.HOME_TRENDING,
      );
      await within(trending).findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-3'),
      );
      expect(rowEventIds(trending)).toEqual(TRENDING_EVENT_IDS);
      expectPredictNextGameCard(trending, 'nfl-1', {
        away: 'Packers',
        home: 'Steelers',
        awayScore: '17',
        homeScore: '21',
        awayQuote: /^PAC\s*· 41¢$/,
        homeQuote: /^STE\s*· 59¢$/,
      });
      expectPredictNextGameCard(trending, 'ncaa-2', {
        away: 'Georgia',
        home: 'Florida',
        awayScore: '3',
        homeScore: '0',
        awayQuote: /^GEO\s*· 55¢$/,
        homeQuote: /^FLO\s*· 45¢$/,
      });
      // NCAAF's third Game ranks after the five Trending shows.
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-3')),
      ).not.toBeOnTheScreen();
    });

    it('shows one pagination dot per Trending card', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3'));

      expect(
        view.getByTestId(PredictHomeTestIds.HOME_TRENDING_PAGINATION, HIDDEN)
          .children,
      ).toHaveLength(TRENDING_EVENT_IDS.length);
      expect(
        view.getByTestId(
          `${PredictHomeTestIds.HOME_TRENDING_PAGINATION}-active`,
          HIDDEN,
        ),
      ).toBeOnTheScreen();
    });

    it('shows the other NFL Games as small cards in the Sports row', async () => {
      const view = renderPredictNext();

      const sports = await view.findByTestId(PredictHomeTestIds.HOME_SPORTS);
      await within(sports).findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-4'),
      );
      expect(rowEventIds(sports)).toEqual(SPORTS_EVENT_IDS);

      const card = within(
        within(sports).getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4')),
      );
      expect(
        card.getByTestId('predict-next-game-header-nfl-4-competition'),
      ).toHaveTextContent('NFL');
      expect(
        card.getByTestId('predict-next-game-header-nfl-4-start'),
      ).toHaveTextContent(formatGameStartShort(STARTS_AT));
      expect(
        card.getByTestId('predict-next-game-logo-fallback-nfl-4-away', HIDDEN),
      ).toHaveTextContent('CHI');
      expect(
        card.getByTestId('predict-next-game-team-label-nfl-4-away'),
      ).toHaveTextContent('CHI');
      expect(
        card.getByTestId(PredictHomeTestIds.gameQuote('nfl-4', 'away')),
      ).toHaveTextContent('55¢');
      expect(
        card.getByTestId('predict-next-game-logo-fallback-nfl-4-home', HIDDEN),
      ).toHaveTextContent('BRO');
      expect(
        card.getByTestId('predict-next-game-team-label-nfl-4-home'),
      ).toHaveTextContent('BRO');
      expect(
        card.getByTestId(PredictHomeTestIds.gameQuote('nfl-4', 'home')),
      ).toHaveTextContent('45¢');
      // The seventh NFL Game is past the NFL read's six.
      expect(
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-7')),
      ).not.toBeOnTheScreen();
    });

    it('replaces the NFL and NCAAF previews with the two rows', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));

      expect(
        view.queryByTestId(PredictHomeTestIds.section(NFL_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.section(NCAA_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
    });

    it('opens the Trending Feed Screen from the Trending header and returns Home', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      messengerCall.mockClear();

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.HOME_TRENDING_HEADER),
      );

      const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      expect(
        within(view.getByTestId(PredictFeedScreenTestIds.HEADER)).getByText(
          'Trending',
        ),
      ).toBeOnTheScreen();
      expect(
        within(within(feedScreen).getByTestId(PredictFeedScreenTestIds.TABS))
          .getAllByRole('button')
          .map((tab) => tab.props.accessibilityLabel),
      ).toEqual(['NFL', 'NCAAF']);
      const list = await view.findByTestId(PredictFeedScreenTestIds.LIST);
      expect(
        await within(list).findByTestId(
          PredictHomeTestIds.event('kalshi', 'nfl-1'),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        NFL_GAMES_FEED_ID,
        { limit: 20 },
      );
      // Trending stays inside Predict: the app's Explore tab never opens.
      expect(
        view.queryByTestId(getRouteProbeTestId(Routes.TRENDING_VIEW)),
      ).not.toBeOnTheScreen();

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
    });

    it('opens its own Feed Screen from each of the Trending, Sports and Politics headers', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
      /** Opens a Feed Screen from a Home header, checks its title, returns
       * its tab labels, and goes back to Home. */
      const openFeedScreenFrom = async (
        headerTestId: string,
        title: string,
      ): Promise<string[]> => {
        fireEvent.press(view.getByTestId(headerTestId));
        const header = await view.findByTestId(PredictFeedScreenTestIds.HEADER);
        expect(within(header).getByText(title)).toBeOnTheScreen();
        const tabs = within(view.getByTestId(PredictFeedScreenTestIds.TABS))
          .getAllByRole('button')
          .map((tab) => tab.props.accessibilityLabel);
        fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));
        await waitFor(() =>
          expect(
            view.queryByTestId(PredictFeedScreenTestIds.VIEW),
          ).not.toBeOnTheScreen(),
        );
        return tabs;
      };

      expect(
        await openFeedScreenFrom(
          PredictHomeTestIds.HOME_TRENDING_HEADER,
          'Trending',
        ),
      ).toEqual(['NFL', 'NCAAF']);
      expect(
        await openFeedScreenFrom(
          PredictHomeTestIds.HOME_SPORTS_HEADER,
          'Sports',
        ),
      ).toEqual(['Games', 'Props']);
      expect(
        await openFeedScreenFrom(
          PredictHomeTestIds.sectionHeader(POLITICS_FEED_SCREEN_ID),
          'Politics',
        ),
      ).toEqual(['Trump', 'Congress', 'Iran']);
      expect(
        view.queryByTestId(getRouteProbeTestId(Routes.TRENDING_VIEW)),
      ).not.toBeOnTheScreen();
    });

    it('omits both rows on a Venue with neither Games Feed, before and after Politics loads', async () => {
      // A Game in the Politics read stays in Politics: the rows take Games
      // from the Games Feeds only.
      let resolvePolitics: (value: unknown) => void = () => undefined;
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: {
          politics: KALSHI_STATIC_VENUE_CATALOG.feeds.politics,
          'politics-trump': KALSHI_STATIC_VENUE_CATALOG.feeds['politics-trump'],
        },
        categories: ['politics'],
      });
      mockPredictNextMessenger((action: string, _venueId: string) => {
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        return new Promise((resolve) => {
          resolvePolitics = resolve;
        });
      });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(
          PredictHomeTestIds.sectionLoading(POLITICS_FEED_SCREEN_ID),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();

      await act(async () => {
        resolvePolitics({
          venueId: 'kalshi',
          id: POLITICS_TRUMP_FEED_ID,
          title: 'Trump',
          events: [
            makePredictNextGameEvent('politics-game', 'Owls', 'Hawks', 'NFL'),
          ],
        });
      });

      const politics = view.getByTestId(
        PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID),
      );
      expect(
        await within(politics).findByTestId(
          PredictHomeTestIds.event('kalshi', 'politics-game'),
        ),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).not.toBeOnTheScreen();
    });

    it('opens the NFL Feed Screen from the Sports header and returns without rereading Home', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      messengerCall.mockClear();

      fireEvent.press(view.getByTestId(PredictHomeTestIds.HOME_SPORTS_HEADER));

      expect(
        await view.findByTestId(PredictFeedScreenTestIds.VIEW),
      ).toBeOnTheScreen();
      expect(view.getByText('Sports')).toBeOnTheScreen();
      expect(view.getAllByText('NFL')[0]).toBeOnTheScreen();

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        NFL_GAMES_FEED_ID,
        { limit: 20 },
      );
      expect(messengerCall).not.toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        NFL_GAMES_FEED_ID,
        { limit: 6 },
      );
    });

    it('opens the Event screen from a Sports card', async () => {
      const view = renderPredictNext();
      const sports = await view.findByTestId(PredictHomeTestIds.HOME_SPORTS);

      fireEvent.press(
        await within(sports).findByTestId(
          PredictHomeTestIds.eventContent('kalshi', 'nfl-4'),
        ),
      );

      expect(
        await view.findByTestId(PredictEventScreenTestIds.GAME_HEADER),
      ).toBeOnTheScreen();
      expect(messengerCall.mock.calls).toEqual(
        expect.arrayContaining([
          expect.arrayContaining([
            'PredictMarketDataService:getEvent',
            'kalshi',
            'nfl-4',
          ]),
        ]),
      );
    });

    it('hides both rows when no read has a Game', async () => {
      configurePredictNextFeeds({ nfl: [], ncaa: [] });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      // A successfully empty read is not a failure.
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).not.toBeOnTheScreen();
    });
  });

  it('renders live game updates received for a Home Event', async () => {
    const view = renderPredictNext();
    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'nfl-1'),
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

    // Trending shows other live Games, so read this card's own score.
    expect(within(card).getByText('28')).toBeOnTheScreen();
    expect(within(card).getByText('24')).toBeOnTheScreen();
    expect(within(card).getByText('Q4 · 01:12')).toBeOnTheScreen();
  });

  describe('live-data subscriptions', () => {
    /** Home cards ask the live-data service for card-visible Markets only. */
    const CARD_SCOPE = { marketScope: 'card' };
    const POLITICS_EVENT_IDS = eventIdsOf(politicsEvents);
    /** Every Event Home shows, in display order. */
    const SHOWN_EVENT_IDS = [
      ...TRENDING_EVENT_IDS,
      ...SPORTS_EVENT_IDS,
      ...POLITICS_EVENT_IDS,
    ];
    const liveDataCalls = () =>
      messengerCall.mock.calls.filter(([action]: [string]) =>
        action.startsWith('PredictLiveDataService:'),
      );

    const layoutHome = (
      view: ReturnType<typeof renderPredictNext>,
      { trendingY, sportsY, politicsY, viewportHeight }: Record<string, number>,
    ) => {
      fireEvent(view.getByTestId(PredictHomeTestIds.SCROLL), 'layout', {
        nativeEvent: { layout: { height: viewportHeight } },
      });
      fireEvent(view.getByTestId(PredictHomeTestIds.HOME_TRENDING), 'layout', {
        nativeEvent: { layout: { y: trendingY, height: 300 } },
      });
      fireEvent(view.getByTestId(PredictHomeTestIds.HOME_SPORTS), 'layout', {
        nativeEvent: { layout: { y: sportsY, height: 180 } },
      });
      fireEvent(
        view.getByTestId(PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID)),
        'layout',
        { nativeEvent: { layout: { y: politicsY, height: 300 } } },
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

    // Every row and section shows Events, so each one's watch is visible.
    const renderLoadedHome = async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
      return view;
    };

    beforeEach(() => {
      configureFullHomeFeeds();
    });

    it('watches every Event Home shows, and only those, once the reads load', async () => {
      await renderLoadedHome();

      // Each read resolves on its own, so the service may hear the watches in
      // any order. The ids are the contract, not the arrival order; sorting
      // keeps extra or duplicate watches failing. The NCAAF Game Trending
      // leaves out is read but never watched.
      expect(watchedEventIds().sort()).toEqual([...SHOWN_EVENT_IDS].sort());
      expect(
        liveDataCalls().filter(
          ([action]) => action === 'PredictLiveDataService:unwatchEvents',
        ),
      ).toEqual([]);
    });

    it('releases a row that is fully below the viewport and rewatches it when scrolled in', async () => {
      const view = await renderLoadedHome();
      messengerCall.mockClear();

      layoutHome(view, {
        trendingY: 200,
        sportsY: 520,
        politicsY: 900,
        viewportHeight: 800,
      });

      expect(liveDataCalls()).toEqual([
        [
          'PredictLiveDataService:unwatchEvents',
          'kalshi',
          POLITICS_EVENT_IDS,
          CARD_SCOPE,
        ],
      ]);

      messengerCall.mockClear();
      await scrollHome(view, 600);

      expect(liveDataCalls()).toEqual([
        [
          'PredictLiveDataService:watchEvents',
          'kalshi',
          POLITICS_EVENT_IDS,
          CARD_SCOPE,
        ],
        [
          'PredictLiveDataService:unwatchEvents',
          'kalshi',
          TRENDING_EVENT_IDS,
          CARD_SCOPE,
        ],
      ]);
    });

    it('keeps a row watched while any part of it overlaps the viewport', async () => {
      const view = await renderLoadedHome();
      messengerCall.mockClear();

      layoutHome(view, {
        trendingY: 200,
        sportsY: 520,
        politicsY: 700,
        viewportHeight: 800,
      });
      await scrollHome(view, 450);

      expect(liveDataCalls()).toEqual([]);
    });

    it('releases every Home watch while an Event Screen is on top and rewatches on return', async () => {
      const view = await renderLoadedHome();
      messengerCall.mockClear();

      fireEvent.press(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      );
      await view.findByTestId(PredictEventScreenTestIds.VIEW);

      expect(messengerCall).toHaveBeenCalledWith(
        'PredictLiveDataService:unwatchEvents',
        'kalshi',
        SHOWN_EVENT_IDS,
        CARD_SCOPE,
      );

      messengerCall.mockClear();
      fireEvent.press(view.getByTestId(PredictEventScreenTestIds.BACK));
      await waitFor(() =>
        expect(messengerCall).toHaveBeenCalledWith(
          'PredictLiveDataService:watchEvents',
          'kalshi',
          SHOWN_EVENT_IDS,
          CARD_SCOPE,
        ),
      );
    });
  });

  it('shows Trending and Sports skeletons until the NFL read settles', async () => {
    let resolveNfl: (value: unknown) => void = () => undefined;
    mockPredictNextMessenger(
      (action: string, _venueId: string, feedId: PredictFeedId) => {
        if (action !== 'PredictMarketDataService:getFeed') {
          return Promise.resolve(undefined);
        }
        if (feedId === NFL_GAMES_FEED_ID) {
          return new Promise((resolve) => {
            resolveNfl = resolve;
          });
        }
        return Promise.resolve({
          venueId: 'kalshi',
          id: feedId,
          title: 'NCAAF Games',
          events: feedId === NCAA_GAMES_FEED_ID ? ncaaEvents : politicsEvents,
        });
      },
    );
    const view = renderPredictNext();

    // Politics does not wait for NFL.
    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1')),
    ).toBeOnTheScreen();
    expect(
      view.getAllByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON).length,
    ).toBeGreaterThan(0);
    expect(
      view.getAllByTestId(PredictHomeTestIds.HOME_SPORTS_SKELETON).length,
    ).toBeGreaterThan(0);
    // Trending ranks Games across both Games reads, so it waits for both.
    expect(
      view.queryByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).not.toBeOnTheScreen();

    await act(async () => {
      resolveNfl({
        venueId: 'kalshi',
        id: NFL_GAMES_FEED_ID,
        title: 'NFL Games',
        events: [...nflEvents, ...MORE_NFL_EVENTS],
      });
    });

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4')),
    ).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_SPORTS_SKELETON),
    ).not.toBeOnTheScreen();
  });

  it('fills Trending from the other reads while the NFL read fails, and recovers', async () => {
    configurePredictNextFeeds({ nfl: new Error('NFL failed') });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
    ).not.toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
    ).not.toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
    ).toBeOnTheScreen();

    configurePredictNextFeeds();
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
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
            feedId === NFL_GAMES_FEED_ID,
        ),
      ).toHaveLength(2),
    );
    expect(
      within(view.getByTestId(PredictHomeTestIds.HOME_TRENDING)).getByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-1'),
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
    ).not.toBeOnTheScreen();
  });

  describe('row loading and failures', () => {
    /**
     * Holds every read of `feedId` until the returned release runs; every
     * other call keeps the configured answers.
     */
    const holdFeedRead = (feedId: PredictFeedId) => {
      const configured = messengerCall.getMockImplementation();
      let release: () => void = () => undefined;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      messengerCall.mockImplementation(
        (action: string, ...params: unknown[]) =>
          action === 'PredictMarketDataService:getFeed' && params[1] === feedId
            ? held.then(() => configured?.(action, ...params))
            : configured?.(action, ...params),
      );
      return () =>
        act(async () => {
          release();
        });
    };
    const feedReadCount = (feedId: PredictFeedId) =>
      messengerCall.mock.calls.filter(
        ([action, , id]) =>
          action === 'PredictMarketDataService:getFeed' && id === feedId,
      ).length;
    const watchedEventIds = () =>
      messengerCall.mock.calls
        .filter(([action]) => action === 'PredictLiveDataService:watchEvents')
        .flatMap(([, , ids]: [string, string, PredictEntityId[]]) => ids);

    it('shows the Trending Games while the Politics read is still pending', async () => {
      // Two NFL and two NCAAF Games: Trending shows all four, Sports none.
      const releasePolitics = holdFeedRead(POLITICS_TRUMP_FEED_ID);
      const view = renderPredictNext();

      const trending = await view.findByTestId(
        PredictHomeTestIds.HOME_TRENDING,
      );
      await within(trending).findByTestId(
        PredictHomeTestIds.event('kalshi', 'ncaa-2'),
      );
      expect(rowEventIds(trending)).toEqual([
        'nfl-1',
        'nfl-2',
        'ncaa-1',
        'ncaa-2',
      ]);
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON),
      ).not.toBeOnTheScreen();
      expect(
        view.getByTestId(
          PredictHomeTestIds.sectionLoading(POLITICS_FEED_SCREEN_ID),
        ),
      ).toBeOnTheScreen();

      await releasePolitics();

      expect(
        await view.findByTestId(
          PredictHomeTestIds.event('kalshi', 'politics-1'),
        ),
      ).toBeOnTheScreen();
      expect(
        rowEventIds(view.getByTestId(PredictHomeTestIds.HOME_TRENDING)),
      ).toEqual(['nfl-1', 'nfl-2', 'ncaa-1', 'ncaa-2']);
    });

    it('holds Sports on skeletons, and watches no row Event, until both Games reads settle', async () => {
      configureFullHomeFeeds();
      const releaseNcaa = holdFeedRead(NCAA_GAMES_FEED_ID);
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
      expect(
        view.getAllByTestId(PredictHomeTestIds.HOME_SPORTS_SKELETON).length,
      ).toBeGreaterThan(0);
      expect(
        view.getAllByTestId(PredictHomeTestIds.HOME_TRENDING_SKELETON).length,
      ).toBeGreaterThan(0);
      // With the NFL read alone, Trending would pick nfl-1 to nfl-5 and
      // Sports would show nfl-6. Neither row paints those partial picks.
      expect(
        view.queryAllByTestId(/^predict-next-event-kalshi-nfl-/),
      ).toHaveLength(0);
      expect(watchedEventIds()).toEqual(eventIdsOf(politicsEvents));

      await releaseNcaa();

      const sports = view.getByTestId(PredictHomeTestIds.HOME_SPORTS);
      await within(sports).findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-4'),
      );
      expect(rowEventIds(sports)).toEqual(SPORTS_EVENT_IDS);
      expect(
        rowEventIds(view.getByTestId(PredictHomeTestIds.HOME_TRENDING)),
      ).toEqual(TRENDING_EVENT_IDS);
    });

    it('shows one Retry when both Games reads fail and recovers both rows in place', async () => {
      configurePredictNextFeeds({
        nfl: new Error('NFL failed'),
        ncaa: new Error('NCAAF failed'),
      });
      const announce = jest.spyOn(
        AccessibilityInfo,
        'announceForAccessibility',
      );
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).toBeOnTheScreen();
      expect(view.getByText('Games couldn’t be loaded.')).toBeOnTheScreen();
      expect(announce).toHaveBeenCalledWith('Games couldn’t be loaded.');
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));
      expect(
        view.getAllByTestId(PredictHomeTestIds.HOME_GAMES_RETRY),
      ).toHaveLength(1);
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();

      configureFullHomeFeeds();
      messengerCall.mockClear();
      // Retry alone recovers: Home stays focused and in the foreground.
      fireEvent.press(view.getByTestId(PredictHomeTestIds.HOME_GAMES_RETRY));

      const trending = await view.findByTestId(
        PredictHomeTestIds.HOME_TRENDING,
      );
      await within(trending).findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-3'),
      );
      expect(rowEventIds(trending)).toEqual(TRENDING_EVENT_IDS);
      expect(
        rowEventIds(view.getByTestId(PredictHomeTestIds.HOME_SPORTS)),
      ).toEqual(SPORTS_EVENT_IDS);
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).not.toBeOnTheScreen();
      // Retry reads the two failed Feeds again, and only those.
      expect(feedReadCount(NFL_GAMES_FEED_ID)).toBe(1);
      expect(feedReadCount(NCAA_GAMES_FEED_ID)).toBe(1);
      expect(feedReadCount(POLITICS_TRUMP_FEED_ID)).toBe(0);
    });

    it('offers Retry when the NFL read alone fails and rereads only that read', async () => {
      configurePredictNextFeeds({
        nfl: new Error('NFL failed'),
        ncaa: [...ncaaEvents, ...MORE_NCAA_EVENTS],
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1'));
      expect(
        view.getByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();

      configureFullHomeFeeds();
      messengerCall.mockClear();
      fireEvent.press(view.getByTestId(PredictHomeTestIds.HOME_GAMES_RETRY));

      const sports = await view.findByTestId(PredictHomeTestIds.HOME_SPORTS);
      await within(sports).findByTestId(
        PredictHomeTestIds.event('kalshi', 'nfl-4'),
      );
      expect(rowEventIds(sports)).toEqual(SPORTS_EVENT_IDS);
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_GAMES_ERROR),
      ).not.toBeOnTheScreen();
      expect(feedReadCount(NFL_GAMES_FEED_ID)).toBe(1);
      expect(feedReadCount(NCAA_GAMES_FEED_ID)).toBe(0);
    });
  });

  it('keeps a Game that goes live in its Trending place until the Feed is read again', async () => {
    const nfl = [
      scheduledGame('nfl-1', 'Bills', 'Rams', 'NFL'),
      scheduledGame('nfl-2', 'Chiefs', 'Broncos', 'NFL'),
      scheduledGame('nfl-3', 'Bears', 'Lions', 'NFL'),
    ];
    const ncaa = [
      scheduledGame('ncaa-1', 'Clemson', 'Duke', 'NCAAF'),
      scheduledGame('ncaa-2', 'Georgia', 'Florida', 'NCAAF'),
    ];
    configurePredictNextFeeds({ nfl, ncaa });
    const view = renderPredictNext();
    const trending = await view.findByTestId(PredictHomeTestIds.HOME_TRENDING);
    await within(trending).findByTestId(
      PredictHomeTestIds.event('kalshi', 'nfl-3'),
    );
    const snapshotOrder = ['nfl-1', 'nfl-2', 'nfl-3', 'ncaa-1', 'ncaa-2'];
    expect(rowEventIds(trending)).toEqual(snapshotOrder);

    act(() => {
      publishPredictNextGameLiveUpdate({
        venueId: 'kalshi' as PredictVenueId,
        eventId: 'nfl-3' as PredictEntityId,
        type: 'football_game',
        status: 'in_progress',
        score: { away: '0', home: '0' },
        period: 'Q1',
        clock: '14:00',
        observedAt: '2026-11-15T18:05:00.000Z' as PredictTimestamp,
      });
    });

    // The card shows the live status, but the carousel keeps its snapshot.
    expect(
      within(
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'nfl-3')),
      ).getByText('Q1 · 14:00'),
    ).toBeOnTheScreen();
    expect(
      rowEventIds(view.getByTestId(PredictHomeTestIds.HOME_TRENDING)),
    ).toEqual(snapshotOrder);

    // The next Feed read returns the Game live, and ranks it first.
    configurePredictNextFeeds({
      nfl: [
        nfl[0],
        nfl[1],
        makePredictNextGameEvent('nfl-3', 'Bears', 'Lions', 'NFL'),
      ],
      ncaa,
    });
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(
        rowEventIds(view.getByTestId(PredictHomeTestIds.HOME_TRENDING)),
      ).toEqual(['nfl-3', 'nfl-1', 'nfl-2', 'ncaa-1', 'ncaa-2']),
    );
  });

  it('hides the Sports row when the NFL read has no Games', async () => {
    configurePredictNextFeeds({ nfl: [] });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
    ).not.toBeOnTheScreen();
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
        view.getByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
      ).toBeOnTheScreen();
      expect(
        view.getByTestId(PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID)),
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
        view.queryByTestId(PredictHomeTestIds.event('kalshi', 'ncaa-1')),
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
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
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
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
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
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
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
        view.queryByTestId(PredictHomeTestIds.HOME_TRENDING),
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

  describe('Politics section', () => {
    it('shows the Politics section with its Trump preview Events', async () => {
      const view = renderPredictNext();

      const section = await waitFor(() =>
        view.getByTestId(PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID)),
      );
      expect(section).toBeOnTheScreen();
      expect(
        within(
          view.getByTestId(
            PredictHomeTestIds.sectionHeader(POLITICS_FEED_SCREEN_ID),
          ),
        ).getByText('Politics'),
      ).toBeOnTheScreen();
      expect(
        await view.findByTestId(
          PredictHomeTestIds.event('kalshi', 'politics-1'),
        ),
      ).toBeOnTheScreen();
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        POLITICS_TRUMP_FEED_ID,
        { limit: 2 },
      );
    });

    it('opens the Politics Feed Screen from the section header', async () => {
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      fireEvent.press(
        view.getByTestId(
          PredictHomeTestIds.sectionHeader(POLITICS_FEED_SCREEN_ID),
        ),
      );

      // Loaded Politics rows also show a "Politics" category label, so the
      // screen title is read from the header only.
      expect(
        await view.findByTestId(PredictFeedScreenTestIds.HEADER),
      ).toBeOnTheScreen();
      expect(
        within(view.getByTestId(PredictFeedScreenTestIds.HEADER)).getByText(
          'Politics',
        ),
      ).toBeOnTheScreen();
    });

    it('opens the Event screen from a Politics card', async () => {
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(
          PredictHomeTestIds.eventContent('kalshi', 'politics-1'),
        ),
      );

      // The screen's root is replaced when the Event read settles, so wait
      // for the loaded header rather than the loading chrome.
      expect(
        await view.findByTestId(PredictEventScreenTestIds.STANDARD_HEADER),
      ).toBeOnTheScreen();
    });

    it('hides the Politics section and reads no Politics Feed when the Venue lacks the Trump key', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: {
          'nfl-games': KALSHI_STATIC_VENUE_CATALOG.feeds['nfl-games'],
          'politics-congress':
            KALSHI_STATIC_VENUE_CATALOG.feeds['politics-congress'],
          'politics-iran': KALSHI_STATIC_VENUE_CATALOG.feeds['politics-iran'],
        },
      });
      const view = renderPredictNext();

      expect(
        await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID)),
      ).not.toBeOnTheScreen();
      expect(
        messengerCall.mock.calls.filter(
          ([action, , feedId]) =>
            action === 'PredictMarketDataService:getFeed' &&
            feedId === POLITICS_TRUMP_FEED_ID,
        ),
      ).toHaveLength(0);
    });
  });

  describe('Categories section', () => {
    const chipIds = (view: ReturnType<typeof renderPredictNext>) =>
      within(view.getByTestId(PredictHomeTestIds.CATEGORIES_LIST))
        .getAllByRole('button')
        .map((chip) => chip.props.testID);

    it('shows the header and the catalog Categories as chips, in catalog order', async () => {
      const view = renderPredictNext();

      const categories = await view.findByTestId(PredictHomeTestIds.CATEGORIES);
      expect(
        within(categories).getByTestId(PredictHomeTestIds.CATEGORIES_HEADER),
      ).toHaveTextContent('Categories');
      expect(chipIds(view)).toEqual([
        PredictHomeTestIds.categoryChip('sports'),
        PredictHomeTestIds.categoryChip('politics'),
      ]);
      expect(
        view.getByTestId(PredictHomeTestIds.categoryChip('sports')),
      ).toHaveTextContent('Sports');
      expect(
        view.getByTestId(PredictHomeTestIds.categoryChip('politics')),
      ).toHaveTextContent('Politics');
    });

    it('follows the order the catalog gives', async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        categories: ['politics', 'sports'],
      });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.CATEGORIES);

      expect(chipIds(view)).toEqual([
        PredictHomeTestIds.categoryChip('politics'),
        PredictHomeTestIds.categoryChip('sports'),
      ]);
    });

    it('sits below the Trending and Sports rows and above Politics', async () => {
      configureFullHomeFeeds();
      const view = renderPredictNext();
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'nfl-4'));
      await view.findByTestId(PredictHomeTestIds.event('kalshi', 'politics-1'));

      const order = [
        PredictHomeTestIds.HOME_TRENDING,
        PredictHomeTestIds.HOME_SPORTS,
        PredictHomeTestIds.CATEGORIES,
        PredictHomeTestIds.section(POLITICS_FEED_SCREEN_ID),
      ];
      const blocks = view.getAllByTestId(new RegExp(`^(${order.join('|')})$`));
      expect(blocks.map((block) => block.props.testID)).toEqual(order);
    });

    it('opens the Politics Feed Screen on the Trump tab from the Politics chip', async () => {
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(PredictHomeTestIds.categoryChip('politics')),
      );

      const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      expect(within(feedScreen).getByText('Politics')).toBeOnTheScreen();
      expect(
        within(feedScreen).getByTestId(PredictFeedScreenTestIds.tab('trump'))
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    it('opens the Sports Feed Screen with NFL and NCAAF tabs, NFL first, from the Sports chip', async () => {
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(PredictHomeTestIds.categoryChip('sports')),
      );

      const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      expect(within(feedScreen).getByText('Sports')).toBeOnTheScreen();
      const tabs = within(
        within(feedScreen).getByTestId(PredictFeedScreenTestIds.TABS),
      )
        .getAllByRole('button')
        .map((tab) => tab.props.accessibilityLabel);
      expect(tabs).toEqual(['NFL', 'NCAAF']);
      expect(
        within(feedScreen).getByTestId(PredictFeedScreenTestIds.tab('nfl'))
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    it('switches the Sports Feed Screen to NCAAF games', async () => {
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(PredictHomeTestIds.categoryChip('sports')),
      );
      fireEvent.press(
        await view.findByTestId(PredictFeedScreenTestIds.tab('ncaaf')),
      );

      await waitFor(() =>
        expect(
          view.getByTestId(PredictFeedScreenTestIds.tab('ncaaf')).props
            .accessibilityState,
        ).toEqual({ selected: true }),
      );
      const list = await view.findByTestId(PredictFeedScreenTestIds.LIST);
      expect(
        await within(list).findByTestId(
          PredictHomeTestIds.event('kalshi', 'ncaa-1'),
        ),
      ).toBeOnTheScreen();
      expect(
        within(list).queryByTestId(PredictHomeTestIds.event('kalshi', 'nfl-1')),
      ).not.toBeOnTheScreen();
    });

    it('shows only the NFL tab when the Venue has no college Games Feed', async () => {
      const { 'college-football-games': _collegeGames, ...feeds } =
        KALSHI_STATIC_VENUE_CATALOG.feeds;
      configurePredictNextCatalog({ ...KALSHI_STATIC_VENUE_CATALOG, feeds });
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(PredictHomeTestIds.categoryChip('sports')),
      );

      const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      expect(
        within(feedScreen).getByTestId(PredictFeedScreenTestIds.tab('nfl')),
      ).toBeOnTheScreen();
      expect(
        within(feedScreen).queryByTestId(PredictFeedScreenTestIds.tab('ncaaf')),
      ).not.toBeOnTheScreen();
    });

    it("opens the tab of the Category's own Feed", async () => {
      configurePredictNextCatalog({
        ...KALSHI_STATIC_VENUE_CATALOG,
        feeds: {
          ...KALSHI_STATIC_VENUE_CATALOG.feeds,
          politics: KALSHI_STATIC_VENUE_CATALOG.feeds['politics-iran'],
        },
      });
      const view = renderPredictNext();

      fireEvent.press(
        await view.findByTestId(PredictHomeTestIds.categoryChip('politics')),
      );

      const feedScreen = await view.findByTestId(PredictFeedScreenTestIds.VIEW);
      expect(
        within(feedScreen).getByTestId(PredictFeedScreenTestIds.tab('iran'))
          .props.accessibilityState,
      ).toEqual({ selected: true });
    });

    it.each([
      ['lists no Categories', { categories: [] }],
      [
        'drops the Category Feed keys',
        {
          feeds: {
            'nfl-games': KALSHI_STATIC_VENUE_CATALOG.feeds['nfl-games'],
          },
        },
      ],
      [
        'lists only a Category mobile has no Feed Screen for',
        { feeds: { crypto: 'crypto' }, categories: ['crypto'] },
      ],
      [
        'lists a Category whose Feed Screen has no tab the Venue supports',
        {
          feeds: { politics: KALSHI_STATIC_VENUE_CATALOG.feeds.politics },
          categories: ['politics'],
        },
      ],
    ])('hides the section when the catalog %s', async (_name, patch) => {
      configurePredictNextCatalog({ ...KALSHI_STATIC_VENUE_CATALOG, ...patch });
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

      expect(
        view.queryByTestId(PredictHomeTestIds.CATEGORIES),
      ).not.toBeOnTheScreen();
    });

    it.each([
      ["another Venue's catalog", POLYMARKET_STATIC_VENUE_CATALOG],
      ['a pending catalog', 'pending' as const],
    ])('shows no Categories for %s', async (_name, catalog) => {
      configurePredictNextCatalog(catalog);
      const view = renderPredictNext();

      await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);

      expect(
        view.queryByTestId(PredictHomeTestIds.CATEGORIES),
      ).not.toBeOnTheScreen();
    });
  });

  describe('venue-generic Home', () => {
    const calls = (action: string) =>
      messengerCall.mock.calls.filter(([name]) => name === action);

    it('renders the rows and Feeds of an arbitrary Venue descriptor', async () => {
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
        makePredictNextGameEvent('test-1', 'Owls', 'Hawks', 'NCAAF'),
        makePredictNextGameEvent('test-2', 'Bears', 'Wolves', 'NCAAF'),
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

      const trending = await view.findByTestId(
        PredictHomeTestIds.HOME_TRENDING,
      );
      expect(
        await within(trending).findByTestId(
          PredictHomeTestIds.event('kalshi', 'test-1'),
        ),
      ).toBeOnTheScreen();
      expect(
        within(trending).getByTestId(
          PredictHomeTestIds.event('kalshi', 'test-2'),
        ),
      ).toBeOnTheScreen();
      // Without an NFL Feed there is no Sports row.
      expect(
        view.queryByTestId(PredictHomeTestIds.HOME_SPORTS),
      ).not.toBeOnTheScreen();
      expect(
        view.queryByTestId(PredictHomeTestIds.SEARCH),
      ).not.toBeOnTheScreen();
      expect(
        calls('PredictMarketDataService:getFeed').map(
          ([, venueId, feedId, params]) => [venueId, feedId, params],
        ),
      ).toEqual([['kalshi', testFeedId, { limit: 4 }]]);
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
