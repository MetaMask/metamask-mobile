import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { focusManager, onlineManager } from '@tanstack/react-query';
import { MarketFooterCardTestIds } from '../../events/markets/MarketFooterCard.testIds';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventScreenTestIds } from '../PredictEvent/PredictEventScreen.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import type { PredictFeedId } from '../../types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import {
  NCAA_GAMES_FEED_ID,
  NCAA_FEED_SCREEN_ID,
  NFL_GAMES_FEED_ID,
  NFL_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';
import {
  configurePredictNextFeeds,
  expectPredictNextGameCard,
  makePredictNextEvent,
  messengerCall,
  ncaaEvents,
  nflEvents,
} from '../../../../../../tests/component-view/fixtures/predictNext';

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

  it('masks Balance when privacy mode is enabled', async () => {
    const view = renderPredictNext(undefined, true);

    await view.findByTestId(PredictHomeTestIds.BALANCE_AMOUNT);
    expect(view.queryByText('$123.13')).not.toBeOnTheScreen();
    expect(view.getByText('Available balance')).toBeOnTheScreen();
  });

  it('keeps Balance failure isolated and retries it', async () => {
    let balanceFails = true;
    messengerCall.mockImplementation(
      (action: string, _venueId: string, id: string) => {
        if (action === 'PredictMarketDataService:getBalance') {
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
      },
    );
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
      'PredictMarketDataService:getBalance',
      'kalshi',
    );

    messengerCall.mockImplementation(
      (action: string, _venueId: string, id: string) => {
        if (action === 'PredictMarketDataService:getBalance') {
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
      },
    );
    now.mockReturnValue(61_001);
    await act(async () => {
      focusManager.setFocused(false);
      focusManager.setFocused(true);
    });

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getBalance',
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
    messengerCall.mockImplementation(
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
    messengerCall.mockImplementation(
      (action: string, _venueId: string, id: string) => {
        if (action === 'PredictMarketDataService:getEvent') {
          return Promise.resolve(nflEvents.find((event) => event.id === id));
        }
        return Promise.resolve({
          venueId: 'kalshi',
          id,
          title: 'Games',
          events: id === 'sports-football-nfl-games' ? nflEvents : ncaaEvents,
        });
      },
    );
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
      await view.findByTestId(MarketFooterCardTestIds.ROOT),
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

  it('does not navigate when a disabled Outcome is pressed', async () => {
    const view = renderPredictNext();
    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'nfl-1'),
    );

    fireEvent.press(
      within(card).getByTestId(PredictHomeTestIds.gameQuote('nfl-1', 'away')),
    );

    expect(view.getByTestId(PredictHomeTestIds.HOME)).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictEventScreenTestIds.VIEW),
    ).not.toBeOnTheScreen();
  });

  it('tracks the homepage entry point', async () => {
    renderPredictNext({
      entryPoint: PredictEventValues.ENTRY_POINT.HOMESCREEN_BALANCE_BREAKDOWN,
    });

    await waitFor(() =>
      expect(
        Engine.context.PredictController.trackHomeViewed,
      ).toHaveBeenCalledWith({
        entryPoint: 'homescreen_balance_breakdown',
      }),
    );
  });
});
