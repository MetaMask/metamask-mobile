import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { act, fireEvent, waitFor, within } from '@testing-library/react-native';
import { focusManager } from '@tanstack/react-query';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventDetailTestIds } from '../PredictEventDetail/PredictEventDetail.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import type { PredictFeedId } from '../../types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import {
  NCAA_FEED_SCREEN_ID,
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
        undefined,
      );
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getFeed',
        'kalshi',
        'sports-football-ncaa-games',
        { limit: 2 },
        undefined,
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
      competition: 'NFL',
      volume: '$1.5M Vol',
    });
    expectPredictNextGameCard(nflSection, 'nfl-2', {
      away: 'Panthers',
      home: 'Cardinals',
      awayScore: '10',
      homeScore: '7',
      awayQuote: 'PAN · 36¢',
      homeQuote: 'CAR · 64¢',
      competition: 'NFL',
      volume: '$2.5k Vol',
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
      competition: 'NCAAF',
      volume: '$500 Vol',
    });
    expectPredictNextGameCard(ncaaSection, 'ncaa-2', {
      away: 'Georgia',
      home: 'Florida',
      awayScore: '3',
      homeScore: '0',
      awayQuote: 'GEO · 55¢',
      homeQuote: 'FLO · 45¢',
      competition: 'NCAAF',
      volume: '$900k Vol',
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
    { feedScreenId: NFL_FEED_SCREEN_ID, selectionLabel: 'NFL' },
    { feedScreenId: NCAA_FEED_SCREEN_ID, selectionLabel: 'NCAAF' },
  ])(
    'opens the $selectionLabel Feed Screen and returns without refetching previews',
    async ({ feedScreenId, selectionLabel }) => {
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
      expect(view.getByText(selectionLabel)).toBeOnTheScreen();

      fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));

      expect(
        await view.findByTestId(PredictHomeTestIds.HOME),
      ).toBeOnTheScreen();
      expect(messengerCall).not.toHaveBeenCalled();
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

    resolveNfl({
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: nflEvents,
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
    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.sectionRetry(NFL_FEED_SCREEN_ID)),
    );
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

  it('opens immutable Event detail from a card', async () => {
    const view = renderPredictNext();

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.eventContent('kalshi', 'nfl-1'),
      ),
    );

    expect(
      await view.findByTestId(PredictEventDetailTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Packers vs Steelers')).toBeOnTheScreen();
    expect(messengerCall).not.toHaveBeenCalledWith(
      'PredictMarketDataService:getEvent',
      expect.anything(),
      expect.anything(),
    );
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
      view.queryByTestId(PredictEventDetailTestIds.VIEW),
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
