import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor, within } from '@testing-library/react-native';
import { PredictHomeTestIds } from './PredictHome.testIds';
import { PredictEventDetailTestIds } from '../PredictEventDetail/PredictEventDetail.testIds';
import type { PredictEvent } from '../../types';

const event: PredictEvent = {
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: 'event-1' as PredictEvent['id'],
  title: 'Who wins the election?',
  subtitle: 'Election 2028',
  markets: [
    {
      id: 'market-1' as PredictEvent['markets'][number]['id'],
      question: 'Candidate A wins',
      status: 'open',
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
    if (action === 'PredictMarketDataService:getEvents') {
      return Promise.resolve({ items: events });
    }
    return Promise.resolve(undefined);
  });
};

describe('PredictHome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureQueries();
  });

  it('loads complete Event data through the Engine messenger', async () => {
    const view = renderPredictNext();

    const card = await view.findByTestId(
      PredictHomeTestIds.event('kalshi', 'event-1'),
    );

    expect(within(card).getByText('Who wins the election?')).toBeOnTheScreen();
    expect(within(card).getByText('Election 2028')).toBeOnTheScreen();
    expect(within(card).getByText('Yes 42¢')).toBeOnTheScreen();
    expect(within(card).getByText('No 58¢')).toBeOnTheScreen();
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
  });

  it('retries both queries after a first-page error', async () => {
    configureQueries();
    messengerCall.mockRejectedValueOnce(new Error('status failed'));
    messengerCall.mockRejectedValueOnce(new Error('events failed'));
    const view = renderPredictNext();
    const retry = await view.findByText('Retry');
    messengerCall.mockClear();

    fireEvent.press(retry);

    await waitFor(() => expect(messengerCall).toHaveBeenCalledTimes(2));
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
      if (action === 'PredictMarketDataService:getEvents') {
        eventRequest += 1;
        if (eventRequest === 1) {
          return Promise.resolve({ items: [event], nextCursor: 'next' });
        }
        if (eventRequest === 2) {
          return Promise.reject(new Error('next page failed'));
        }
        return Promise.resolve({
          items: [{ ...event, id: 'event-2', title: 'Second Event' }],
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
