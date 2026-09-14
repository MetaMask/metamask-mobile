import { renderHook } from '@testing-library/react-native';
import { PREDICT_LIVE_DATA_SERVICE_NAME } from '../services/PredictLiveDataService';
import type { PredictEntityId, PredictEvent, PredictVenueId } from '../types';
import { useEventsWithLiveGames } from './useEventsWithLiveGames';

const mockCall = jest.fn();
const mockSubscribe = jest.fn();
const mockUnsubscribe = jest.fn();

jest.mock('../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    controllerMessenger: {
      call: (...args: unknown[]) => mockCall(...args),
      subscribe: (...args: unknown[]) => mockSubscribe(...args),
      unsubscribe: (...args: unknown[]) => mockUnsubscribe(...args),
    },
  },
}));

const venueId = 'kalshi' as PredictVenueId;

const makeEvent = (id: string): PredictEvent => ({
  venueId,
  id: id as PredictEntityId,
  title: id,
  markets: [],
});

const eventA = makeEvent('event-a');
const eventB = makeEvent('event-b');

const watchCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`,
  );
const unwatchCalls = () =>
  mockCall.mock.calls.filter(
    ([action]) => action === `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
  );

describe('useEventsWithLiveGames', () => {
  beforeEach(() => {
    mockCall.mockClear();
    mockSubscribe.mockClear();
    mockUnsubscribe.mockClear();
  });

  it('watches the Event ids on mount', () => {
    renderHook(() => useEventsWithLiveGames(venueId, [eventA]));

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
    ]);
    expect(unwatchCalls()).toEqual([]);
  });

  it('watches only newly added Event ids when the list grows', () => {
    const { rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveGames(venueId, events),
      { initialProps: { events: [eventA] } },
    );

    rerender({ events: [eventA, eventB] });

    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventB.id]],
    ]);
    expect(unwatchCalls()).toEqual([]);
  });

  it('unwatches only removed Event ids when the list changes', () => {
    const { rerender } = renderHook(
      ({ events }: { events: readonly PredictEvent[] }) =>
        useEventsWithLiveGames(venueId, events),
      { initialProps: { events: [eventA] } },
    );

    rerender({ events: [eventB] });

    expect(unwatchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`, venueId, [eventA.id]],
    ]);
    expect(watchCalls()).toEqual([
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventA.id]],
      [`${PREDICT_LIVE_DATA_SERVICE_NAME}:watchGames`, venueId, [eventB.id]],
    ]);
  });

  it('unwatches remaining Event ids on unmount', () => {
    const { unmount } = renderHook(() =>
      useEventsWithLiveGames(venueId, [eventA, eventB]),
    );

    unmount();

    expect(unwatchCalls()).toEqual([
      [
        `${PREDICT_LIVE_DATA_SERVICE_NAME}:unwatchGames`,
        venueId,
        [eventA.id, eventB.id],
      ],
    ]);
  });
});
