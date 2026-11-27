import type { AppStateStatus } from 'react-native';
import Logger from '../../../../../util/Logger';
import indexFrames from '../../contracts/v1/fixtures/index-topic-frames.json';
import type { PredictEntityId, PredictVenueId } from '../../types';
import {
  PREDICT_LIVE_DATA_DEFAULT_INDEX_MAX_PER_CONNECTION,
  PREDICT_LIVE_DATA_DEFAULT_INDEX_MAX_PER_MESSAGE,
  PredictLiveDataClient,
} from './PredictLiveDataClient';

jest.mock('../../../../../util/trace', () => {
  const actual = jest.requireActual('../../../../../util/trace');
  return { ...actual, trace: jest.fn(), endTrace: jest.fn() };
});

const venueId = 'kalshi' as PredictVenueId;
const eventId = indexFrames.snapshot.index.eventId as PredictEntityId;

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readyState = 0;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event?: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(readonly url: string) {
    MockWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = 1;
  }

  message(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent);
  }
}

const appState = {
  addEventListener: jest.fn(
    (_type: 'change', _listener: (state: AppStateStatus) => void) => ({
      remove: jest.fn(),
    }),
  ),
};

const flushConnect = async (): Promise<void> => {
  for (let tick = 0; tick < 5; tick += 1) {
    await Promise.resolve();
  }
};

const setup = () => {
  const onIndexSnapshot = jest.fn();
  const onIndexUpdate = jest.fn();
  const onIndexError = jest.fn();
  const onIndexReleased = jest.fn();
  const client = new PredictLiveDataClient({
    baseUrl: 'http://localhost:3333',
    getBearerToken: async () => 'test-token',
    WebSocket: MockWebSocket as unknown as typeof WebSocket,
    AppState: appState,
    onGameUpdate: jest.fn(),
    onQuoteUpdate: jest.fn(),
    onIndexSnapshot,
    onIndexUpdate,
    onIndexError,
    onIndexReleased,
  });
  return {
    client,
    onIndexSnapshot,
    onIndexUpdate,
    onIndexError,
    onIndexReleased,
  };
};

const connect = async (client: PredictLiveDataClient) => {
  client.subscribe('index', venueId, [eventId]);
  await flushConnect();
  const socket = MockWebSocket.instances[0];
  socket.open();
  socket.message(indexFrames.welcome);
  return socket;
};

describe('PredictLiveDataClient index topic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('subscribes the Event ids under the events key', async () => {
    const { client } = setup();

    const socket = await connect(client);

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'index',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('unsubscribes the Event when the last watcher leaves', async () => {
    const { client } = setup();
    const socket = await connect(client);

    const released = client.unsubscribe('index', venueId, [eventId]);

    expect(released).toEqual([eventId]);
    expect(socket.send).toHaveBeenLastCalledWith(
      JSON.stringify({
        type: 'unsubscribe',
        topic: 'index',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('keeps the subscription while another watcher holds the Event', async () => {
    const { client } = setup();
    const socket = await connect(client);
    client.subscribe('index', venueId, [eventId]);
    socket.send.mockClear();

    const released = client.unsubscribe('index', venueId, [eventId]);

    expect(released).toEqual([]);
    expect(socket.send).not.toHaveBeenCalled();
  });

  it('delivers a snapshot and a tick of a watched Event', async () => {
    const { client, onIndexSnapshot, onIndexUpdate } = setup();
    const socket = await connect(client);

    socket.message(indexFrames.snapshot);
    socket.message(indexFrames.update);

    expect(onIndexSnapshot).toHaveBeenCalledWith(indexFrames.snapshot.index);
    expect(onIndexUpdate).toHaveBeenCalledWith(indexFrames.update.index);
  });

  it('ignores frames of an Event nobody watches', async () => {
    const { client, onIndexSnapshot, onIndexUpdate } = setup();
    const socket = await connect(client);

    socket.message({
      ...indexFrames.update,
      index: { ...indexFrames.update.index, eventId: 'KXETH15M-OTHER' },
    });
    client.unsubscribe('index', venueId, [eventId]);
    socket.message(indexFrames.snapshot);

    expect(onIndexSnapshot).not.toHaveBeenCalled();
    expect(onIndexUpdate).not.toHaveBeenCalled();
  });

  it('reports an error frame of a watched index Event without logging it', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const { client, onIndexError } = setup();
    const socket = await connect(client);

    socket.message(indexFrames.errorUpstreamStale);
    socket.message(indexFrames.errorUpstreamStale);

    expect(onIndexError).toHaveBeenCalledTimes(2);
    expect(onIndexError).toHaveBeenCalledWith({
      venueId,
      eventId,
      code: 'upstream_stale',
      message: 'Index feed is behind.',
    });
    expect(log).not.toHaveBeenCalled();
  });

  it('routes an error without a topic by its Event id', async () => {
    const { client, onIndexError } = setup();
    const socket = await connect(client);

    socket.message(indexFrames.errorWithoutTopic);

    expect(onIndexError).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, code: 'no_live_data' }),
    );
  });

  it('still logs an error frame without a topic that names no index Event', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const { client, onIndexError } = setup();
    const socket = await connect(client);

    socket.message({ ...indexFrames.errorWithoutTopic, events: ['other'] });
    socket.message(indexFrames.errorOtherTopic);

    expect(onIndexError).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledTimes(2);
  });

  it('does not log or report an index error for an Event it no longer watches', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const { client, onIndexError } = setup();
    const socket = await connect(client);
    client.unsubscribe('index', venueId, [eventId]);

    socket.message(indexFrames.errorTooManyEvents);

    expect(onIndexError).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it('reports too_many_events for the refused Event', async () => {
    const { client, onIndexError } = setup();
    const socket = await connect(client);

    socket.message(indexFrames.errorTooManyEvents);

    expect(onIndexError).toHaveBeenCalledWith(
      expect.objectContaining({ eventId, code: 'too_many_events' }),
    );
  });

  it.each(['no_live_data', 'too_many_events', 'venue_at_capacity'])(
    'sends no unsubscribe for an Event the server refused with %s',
    async (code) => {
      const { client } = setup();
      const socket = await connect(client);
      socket.message({ ...indexFrames.errorNoLiveData, code });
      socket.send.mockClear();

      client.unsubscribe('index', venueId, [eventId]);

      expect(socket.send).not.toHaveBeenCalled();
    },
  );

  it('still unsubscribes an Event after upstream_stale', async () => {
    const { client } = setup();
    const socket = await connect(client);
    socket.message(indexFrames.errorUpstreamStale);
    socket.send.mockClear();

    client.unsubscribe('index', venueId, [eventId]);

    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining('"type":"unsubscribe"'),
    );
  });

  it('delivers the snapshot when it comes after subscribed', async () => {
    const { client, onIndexSnapshot, onIndexUpdate } = setup();
    const socket = await connect(client);

    socket.message(indexFrames.subscribed);
    socket.message(indexFrames.updateWithoutRawValue);
    socket.message(indexFrames.snapshot);

    expect(onIndexUpdate).toHaveBeenCalledTimes(1);
    expect(onIndexSnapshot).toHaveBeenCalledWith(indexFrames.snapshot.index);
  });

  describe('unsubscribed by the server', () => {
    it('drops the Event from the refcount without an error', async () => {
      const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
      const { client, onIndexError, onIndexReleased, onIndexUpdate } = setup();
      const socket = await connect(client);
      client.subscribe('index', venueId, [eventId]);

      socket.message(indexFrames.unsubscribedByServer);
      socket.message(indexFrames.update);

      expect(onIndexReleased).toHaveBeenCalledWith([eventId]);
      expect(onIndexError).not.toHaveBeenCalled();
      expect(log).not.toHaveBeenCalled();
      // Both watchers are gone, so the client delivers nothing and a later
      // release has nothing to send.
      expect(onIndexUpdate).not.toHaveBeenCalled();
      socket.send.mockClear();
      expect(client.unsubscribe('index', venueId, [eventId])).toEqual([]);
      expect(socket.send).not.toHaveBeenCalled();
    });

    it('frees the connection slot so the Event can be watched again', async () => {
      const { client } = setup();
      const socket = await connect(client);
      socket.message(indexFrames.unsubscribedByServer);
      socket.send.mockClear();

      client.subscribe('index', venueId, [eventId]);

      expect(socket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"subscribe"'),
      );
    });

    it.each(['window_closed', 'unavailable'])(
      'drops the Event for reason %s',
      async (reason) => {
        const { client, onIndexReleased } = setup();
        const socket = await connect(client);

        socket.message({ ...indexFrames.unsubscribedByServer, reason });

        expect(onIndexReleased).toHaveBeenCalledWith([eventId]);
      },
    );

    it('ignores an acknowledgement without a reason', async () => {
      const { client, onIndexReleased, onIndexUpdate } = setup();
      const socket = await connect(client);

      socket.message(indexFrames.unsubscribedAck);
      socket.message(indexFrames.unsubscribedAckEmpty);
      socket.message(indexFrames.update);

      expect(onIndexReleased).not.toHaveBeenCalled();
      expect(onIndexUpdate).toHaveBeenCalledTimes(1);
    });

    it('keeps the new watch when the ack of an old unsubscribe arrives after a resubscribe', async () => {
      const { client, onIndexReleased, onIndexUpdate } = setup();
      const socket = await connect(client);

      client.unsubscribe('index', venueId, [eventId]);
      client.subscribe('index', venueId, [eventId]);
      socket.message(indexFrames.unsubscribedAck);
      socket.message(indexFrames.update);

      expect(onIndexReleased).not.toHaveBeenCalled();
      expect(onIndexUpdate).toHaveBeenCalledTimes(1);
      socket.send.mockClear();
      expect(client.unsubscribe('index', venueId, [eventId])).toEqual([
        eventId,
      ]);
      expect(socket.send).toHaveBeenCalledWith(
        expect.stringContaining('"type":"unsubscribe"'),
      );
    });

    it('ignores unsubscribed for an Event nobody watches', async () => {
      const { client, onIndexReleased } = setup();
      const socket = await connect(client);
      client.unsubscribe('index', venueId, [eventId]);

      socket.message(indexFrames.unsubscribedByServer);

      expect(onIndexReleased).not.toHaveBeenCalled();
    });

    it('does not read an unsubscribed frame of another topic as an index release', async () => {
      const { client, onIndexReleased } = setup();
      client.subscribe('game', venueId, [eventId]);
      const socket = await connect(client);

      socket.message({
        type: 'unsubscribed',
        topic: 'game',
        venueId,
        events: [eventId],
        reason: 'window_closed',
      });

      expect(onIndexReleased).not.toHaveBeenCalled();
    });
  });

  it('resubscribes the watched Events after a reconnect', async () => {
    const { client } = setup();
    const first = await connect(client);

    first.close();
    jest.advanceTimersByTime(1000);
    await flushConnect();
    const second = MockWebSocket.instances[1];
    second.open();
    second.message(indexFrames.welcome);

    expect(second.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'index',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('splits subscriptions at the index limits', async () => {
    const { client } = setup();
    const ids = Array.from(
      { length: PREDICT_LIVE_DATA_DEFAULT_INDEX_MAX_PER_MESSAGE + 1 },
      (_value, index) => `KXBTC15M-${index}` as PredictEntityId,
    );
    client.subscribe('index', venueId, ids);
    await flushConnect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message({
      ...indexFrames.welcome,
      limits: undefined,
    });

    const sent = socket.send.mock.calls.map(([body]) => JSON.parse(body));
    expect(sent.map(({ events }) => events.length)).toEqual([
      PREDICT_LIVE_DATA_DEFAULT_INDEX_MAX_PER_MESSAGE,
      1,
    ]);
    expect(PREDICT_LIVE_DATA_DEFAULT_INDEX_MAX_PER_CONNECTION).toBe(8);
  });
});
