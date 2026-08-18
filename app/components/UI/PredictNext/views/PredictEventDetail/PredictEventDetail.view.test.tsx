import '../../../../../../tests/component-view/mocks';
import { renderPredictNext } from '../../../../../../tests/component-view/renderers/predictNext';
import Engine from '../../../../../core/Engine';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { PredictHomeTestIds } from '../PredictHome/PredictHome.testIds';
import { PredictEventDetailTestIds } from './PredictEventDetail.testIds';
import { PredictMarketHistoryTestIds } from '../../components/PredictMarketHistory/PredictMarketHistory.testIds';
import type { PredictEvent } from '../../types';

const event: PredictEvent = {
  venueId: 'kalshi' as PredictEvent['venueId'],
  id: 'event-1' as PredictEvent['id'],
  title: 'Who wins the election?',
  markets: [
    {
      id: 'market-1' as PredictEvent['markets'][number]['id'],
      question: 'Candidate A wins',
      status: 'open',
      outcomes: [
        {
          id: 'market-1:yes' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'yes',
          label: 'Candidate A',
        },
        {
          id: 'market-1:no' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'no',
          label: 'No',
        },
      ],
    },
    {
      id: 'market-2' as PredictEvent['markets'][number]['id'],
      question: 'Candidate B wins',
      status: 'open',
      outcomes: [
        {
          id: 'market-2:yes' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'yes',
          label: 'Candidate B',
        },
        {
          id: 'market-2:no' as PredictEvent['markets'][number]['outcomes'][number]['id'],
          side: 'no',
          label: 'No',
        },
      ],
    },
  ],
};

const messengerCall = Engine.controllerMessenger.call as unknown as jest.Mock;

const history = (marketId: string, range: string, points = 2) => ({
  venueId: 'kalshi',
  marketId,
  range,
  observedAt: '2026-08-17T20:00:00Z',
  points: [
    { timestamp: '2026-08-17T18:00:00Z', yesPrice: '0.40', noPrice: '0.60' },
    { timestamp: '2026-08-17T20:00:00Z', yesPrice: '0.42', noPrice: '0.58' },
  ].slice(0, points),
});

const configureQueries = () => {
  messengerCall.mockImplementation(
    (action: string, _venueId?: string, id?: string, range?: string) => {
      if (action === 'PredictMarketDataService:getVenueStatus') {
        return Promise.resolve({
          venueId: 'kalshi',
          status: 'available',
          checkedAt: '2026-08-17T20:00:00Z',
        });
      }
      if (action === 'PredictMarketDataService:getEvents') {
        return Promise.resolve({ items: [event] });
      }
      if (action === 'PredictMarketDataService:getEvent') {
        return Promise.resolve(event);
      }
      if (action === 'PredictMarketDataService:getMarketHistory') {
        return Promise.resolve(history(id ?? 'market-1', range ?? 'LIVE'));
      }
      return Promise.resolve(undefined);
    },
  );
};

const openDetail = async () => {
  const view = renderPredictNext();
  fireEvent.press(
    await view.findByTestId(
      PredictHomeTestIds.eventContent('kalshi', 'event-1'),
    ),
  );
  await view.findByTestId(PredictEventDetailTestIds.VIEW);
  return view;
};

describe('PredictEventDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    configureQueries();
  });

  it('selects a Market and fetches its Live history', async () => {
    const view = await openDetail();
    const firstChart = await view.findByTestId(
      PredictMarketHistoryTestIds.CHART,
    );
    expect(
      view.getByTestId(PredictEventDetailTestIds.market('market-1')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    expect(
      view.getByTestId(PredictEventDetailTestIds.market('market-2')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
    fireEvent(firstChart, 'layout', {
      nativeEvent: { layout: { width: 400, height: 250 } },
    });
    await view.findByLabelText(
      'Market probability history. Candidate A 42%, No 58%',
    );
    messengerCall.mockClear();

    fireEvent.press(
      view.getByTestId(PredictEventDetailTestIds.market('market-2')),
    );

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getMarketHistory',
        event.venueId,
        event.markets[1].id,
        'LIVE',
        undefined,
      ),
    );
    expect(
      view.getByTestId(PredictEventDetailTestIds.market('market-1')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
    expect(
      view.getByTestId(PredictEventDetailTestIds.market('market-2')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    const secondChart = await view.findByTestId(
      PredictMarketHistoryTestIds.CHART,
    );
    fireEvent(secondChart, 'layout', {
      nativeEvent: { layout: { width: 400, height: 250 } },
    });
    expect(
      await view.findByLabelText(
        'Market probability history. Candidate B 42%, No 58%',
      ),
    ).toBeOnTheScreen();
    expect(
      view.queryByLabelText(
        'Market probability history. Candidate A 42%, No 58%',
      ),
    ).not.toBeOnTheScreen();
  });

  it('selects a range and fetches the same Market identity', async () => {
    const view = await openDetail();
    await view.findByTestId(PredictMarketHistoryTestIds.CHART);
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.range('LIVE')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
    messengerCall.mockClear();

    fireEvent.press(view.getByTestId(PredictMarketHistoryTestIds.range('1W')));

    await waitFor(() =>
      expect(messengerCall).toHaveBeenCalledWith(
        'PredictMarketDataService:getMarketHistory',
        event.venueId,
        event.markets[0].id,
        '1W',
        undefined,
      ),
    );
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.range('LIVE')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: false }));
    expect(
      view.getByTestId(PredictMarketHistoryTestIds.range('1W')).props
        .accessibilityState,
    ).toEqual(expect.objectContaining({ selected: true }));
  });

  it('shows loading while Market history is pending', async () => {
    let resolveHistory:
      | ((value: ReturnType<typeof history>) => void)
      | undefined;
    const baseImplementation = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'PredictMarketDataService:getMarketHistory') {
        return new Promise((resolve) => {
          resolveHistory = resolve;
        });
      }
      return baseImplementation?.(...args);
    });
    const view = await openDetail();

    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.LOADING),
    ).toBeOnTheScreen();
    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.CHART),
    ).not.toBeOnTheScreen();

    resolveHistory?.(history('market-1', 'LIVE'));

    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
  });

  it('retries failed Market history', async () => {
    let historyRequest = 0;
    const baseImplementation = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'PredictMarketDataService:getMarketHistory') {
        historyRequest += 1;
        if (historyRequest === 1) {
          return Promise.reject(new Error('history failed'));
        }
      }
      return baseImplementation?.(...args);
    });
    const view = await openDetail();
    const retry = await view.findByText('Retry');

    fireEvent.press(retry);

    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
    expect(historyRequest).toBe(2);
  });

  it('retries failed Event details', async () => {
    let eventRequest = 0;
    const baseImplementation = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'PredictMarketDataService:getEvent') {
        eventRequest += 1;
        if (eventRequest === 1) {
          return Promise.reject(new Error('event failed'));
        }
      }
      return baseImplementation?.(...args);
    });
    const view = await openDetail();
    await view.findByTestId(PredictEventDetailTestIds.ERROR);

    fireEvent.press(view.getByText('Retry'));

    expect(
      await view.findByTestId(PredictMarketHistoryTestIds.CHART),
    ).toBeOnTheScreen();
    expect(eventRequest).toBe(2);
  });

  it('shows an empty state instead of an empty chart', async () => {
    const baseImplementation = messengerCall.getMockImplementation();
    messengerCall.mockImplementation((...args: unknown[]) => {
      if (args[0] === 'PredictMarketDataService:getMarketHistory') {
        return Promise.resolve(history(String(args[2]), String(args[3]), 0));
      }
      return baseImplementation?.(...args);
    });
    const view = await openDetail();

    await view.findByTestId(PredictMarketHistoryTestIds.EMPTY);

    expect(
      view.queryByTestId(PredictMarketHistoryTestIds.CHART),
    ).not.toBeOnTheScreen();
  });
});
