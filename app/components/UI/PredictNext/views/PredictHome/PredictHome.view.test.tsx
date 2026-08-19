import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventDetailTestIds } from '../PredictEventDetail/PredictEventDetail.testIds';
import { PredictFeedScreenTestIds } from '../PredictFeedScreen/PredictFeedScreen.testIds';
import type { PredictEvent, PredictFeedId } from '../../types';
import { PredictEventValues } from '../../../Predict/constants/eventNames';
import {
  NCAA_FEED_SCREEN_ID,
  NFL_FEED_SCREEN_ID,
} from '../../navigation/feedScreens';

const makeEvent = (id: string, title: string): PredictEvent => ({
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: id as PredictEvent['id'],
  title,
  category: 'Sports',
  volume: '1500000',
  markets: [
    {
      id: `${id}-market` as PredictEvent['markets'][number]['id'],
      question: title,
      status: 'active',
      outcomes: [
        {
          id: `${id}-yes` as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'yes',
          label: 'Yes',
          askPrice:
            '0.42' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
        {
          id: `${id}-no` as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'no',
          label: 'No',
          askPrice:
            '0.58' as PredictEvent['markets'][number]['outcomes'][number]['askPrice'],
        },
      ],
    },
  ],
});

const nflEvents = [
  makeEvent('nfl-1', 'Packers vs Steelers'),
  makeEvent('nfl-2', 'Panthers vs Cardinals'),
];
const ncaaEvents = [
  makeEvent('ncaa-1', 'Pittsburgh vs Miami'),
  makeEvent('ncaa-2', 'Georgia vs Florida'),
];

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const configureFeeds = ({
  nfl = nflEvents,
  ncaa = ncaaEvents,
}: {
  nfl?: readonly PredictEvent[] | Error;
  ncaa?: readonly PredictEvent[] | Error;
} = {}) => {
  messengerCall.mockImplementation(
    (action: string, _venueId: string, feedId: PredictFeedId) => {
      if (action !== 'PredictMarketDataService:getFeed') {
        return Promise.resolve(undefined);
      }

      const result = feedId === 'sports-football-nfl-games' ? nfl : ncaa;
      if (result instanceof Error) {
        return Promise.reject(result);
      }

      return Promise.resolve({
        venueId: 'kalshi',
        id: feedId,
        title:
          feedId === 'sports-football-nfl-games' ? 'NFL Games' : 'NCAAF Games',
        events: result,
      });
    },
  );
};

describe('PredictHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureFeeds();
  });

  it('loads the first two backend-ordered Games for both previews', async () => {
    configureFeeds({
      nfl: [...nflEvents, makeEvent('nfl-3', 'Hidden NFL Game')],
      ncaa: [...ncaaEvents, makeEvent('ncaa-3', 'Hidden College Game')],
    });
    const view = renderPredictNext();

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(2));

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
    expect(await view.findByText('Packers vs Steelers')).toBeOnTheScreen();
    expect(view.getByText('Panthers vs Cardinals')).toBeOnTheScreen();
    expect(view.queryByText('Hidden NFL Game')).not.toBeOnTheScreen();
    expect(view.getByText('Pittsburgh vs Miami')).toBeOnTheScreen();
    expect(view.getByText('Georgia vs Florida')).toBeOnTheScreen();
    expect(view.queryByText('Hidden College Game')).not.toBeOnTheScreen();
  });

  it('opens the NFL Feed Screen and returns without refetching previews', async () => {
    const view = renderPredictNext();
    await view.findByText('Packers vs Steelers');
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.sectionHeader(NFL_FEED_SCREEN_ID)),
    );

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Sports')).toBeOnTheScreen();
    expect(view.getByText('NFL')).toBeOnTheScreen();
    fireEvent.press(view.getByTestId(PredictFeedScreenTestIds.BACK));
    await view.findByTestId(PredictHomeTestIds.HOME);
    expect(messengerCall).not.toHaveBeenCalled();
  });

  it('opens the NCAAF Feed Screen', async () => {
    const view = renderPredictNext();

    fireEvent.press(
      await view.findByTestId(
        PredictHomeTestIds.sectionHeader(NCAA_FEED_SCREEN_ID),
      ),
    );

    expect(
      await view.findByTestId(PredictFeedScreenTestIds.VIEW),
    ).toBeOnTheScreen();
    expect(view.getByText('Sports')).toBeOnTheScreen();
    expect(view.getByText('NCAAF')).toBeOnTheScreen();
  });

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

    expect(await view.findByText('Pittsburgh vs Miami')).toBeOnTheScreen();
    expect(
      view.getByTestId(PredictHomeTestIds.sectionLoading(NFL_FEED_SCREEN_ID)),
    ).toBeOnTheScreen();

    resolveNfl({
      venueId: 'kalshi',
      id: 'sports-football-nfl-games',
      title: 'NFL Games',
      events: nflEvents,
    });
    expect(await view.findByText('Packers vs Steelers')).toBeOnTheScreen();
  });

  it('keeps an errored NFL preview independent from a successful NCAAF preview', async () => {
    configureFeeds({ nfl: new Error('NFL failed') });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionError(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(view.getByText('Pittsburgh vs Miami')).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictHomeTestIds.sectionError(NCAA_FEED_SCREEN_ID)),
    ).not.toBeOnTheScreen();

    configureFeeds();
    fireEvent.press(
      view.getByTestId(PredictHomeTestIds.sectionRetry(NFL_FEED_SCREEN_ID)),
    );
    expect(await view.findByText('Packers vs Steelers')).toBeOnTheScreen();
  });

  it('keeps an empty NFL preview independent from a successful NCAAF preview', async () => {
    configureFeeds({ nfl: [] });
    const view = renderPredictNext();

    expect(
      await view.findByTestId(
        PredictHomeTestIds.sectionEmpty(NFL_FEED_SCREEN_ID),
      ),
    ).toBeOnTheScreen();
    expect(view.getByText('Pittsburgh vs Miami')).toBeOnTheScreen();
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
      within(card).getByTestId(PredictHomeTestIds.outcome('nfl-1', 'yes')),
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
