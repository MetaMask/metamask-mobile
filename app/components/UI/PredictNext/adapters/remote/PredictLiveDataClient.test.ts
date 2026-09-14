import Logger from '../../../../../util/Logger';
import type { PredictEntityId, PredictVenueId } from '../../types';
import {
  PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS,
  PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS,
  PREDICT_LIVE_DATA_RECONNECT_BASE_MS,
  PREDICT_LIVE_DATA_RECONNECT_MAX_MS,
  PredictLiveDataClient,
} from './PredictLiveDataClient';

const venueId = 'kalshi' as PredictVenueId;
const eventId = 'KXTEST-EVENT' as PredictEntityId;

// Mirrors the fields the gateway actually sends, not just the ones mobile reads.
const welcomeFrame = {
  type: 'welcome',
  protocol: 1,
  heartbeatMs: 30000,
  topics: ['market', 'game'],
  venues: ['kalshi'],
  limits: {
    market: { maxPerConnection: 250, maxPerMessage: 100 },
    game: { maxPerConnection: 50, maxPerMessage: 100 },
  },
};

class MockWebSocket {
  static instances: MockWebSocket[] = [];
  readonly url: string;
  readyState = 0;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3;
    this.onclose?.();
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }

  open(): void {
    this.readyState = 1;
  }

  message(value: unknown): void {
    this.onmessage?.({ data: JSON.stringify(value) } as MessageEvent);
  }
}

const createClient = (onGameUpdate = jest.fn()) =>
  new PredictLiveDataClient({
    baseUrl: 'http://localhost:3333',
    WebSocket: MockWebSocket as unknown as typeof WebSocket,
    onGameUpdate,
  });

const openAndWelcome = (socket = MockWebSocket.instances[0]): MockWebSocket => {
  socket.open();
  socket.message(welcomeFrame);
  return socket;
};

describe('PredictLiveDataClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(1);
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('subscribes to game updates after the welcome frame', () => {
    const client = createClient();

    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();

    expect(socket.url).toBe('ws://localhost:3333/v1/stream/live-data');
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('forwards game and game_snapshot frames and disconnects after the linger', () => {
    const onGameUpdate = jest.fn();
    const client = new PredictLiveDataClient({
      baseUrl: 'https://predict.example',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate,
    });
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();
    const game = {
      venueId,
      eventId,
      type: 'football_game',
      details: { home_points: 7 },
    };

    socket.message({ type: 'game', game });
    socket.message({ type: 'game_snapshot', game });
    client.unsubscribe(venueId, [eventId]);

    expect(onGameUpdate).toHaveBeenNthCalledWith(1, game);
    expect(onGameUpdate).toHaveBeenNthCalledWith(2, game);
    expect(socket.send).toHaveBeenLastCalledWith(
      JSON.stringify({
        type: 'unsubscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
    expect(socket.close).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('keeps an Event subscribed while another watcher still holds it', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();
    socket.send.mockClear();

    client.subscribe(venueId, [eventId]);
    const released = client.unsubscribe(venueId, [eventId]);

    expect(released).toEqual([]);
    expect(socket.send).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();

    expect(client.unsubscribe(venueId, [eventId])).toEqual([eventId]);
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'unsubscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
    expect(socket.close).not.toHaveBeenCalled();

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('keeps the socket open when a new subscribe arrives during the linger', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();
    client.unsubscribe(venueId, [eventId]);
    socket.send.mockClear();

    client.subscribe(venueId, [eventId]);
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);

    expect(socket.close).not.toHaveBeenCalled();
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('reconnects with backoff and resubscribes after the socket closes while Events are still watched', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();

    socket.onclose?.();

    expect(MockWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS - 1);

    expect(MockWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(1);
    const nextSocket = openAndWelcome(MockWebSocket.instances[1]);

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(nextSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('doubles the reconnect delay after a second close', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    openAndWelcome();

    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    MockWebSocket.instances[1].onclose?.();

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS * 2 - 1);

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(1);

    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('resets reconnect backoff after a welcome frame', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    openAndWelcome();
    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    openAndWelcome(MockWebSocket.instances[1]);
    MockWebSocket.instances[1].onclose?.();

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS - 1);

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(1);

    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('stops reconnecting after the max number of attempts', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);

    for (
      let attempt = 0;
      attempt < PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS;
      attempt++
    ) {
      MockWebSocket.instances[attempt].onclose?.();
      jest.advanceTimersByTime(
        Math.min(
          PREDICT_LIVE_DATA_RECONNECT_MAX_MS,
          PREDICT_LIVE_DATA_RECONNECT_BASE_MS * 2 ** attempt,
        ),
      );
    }

    const socketsAfterCap = MockWebSocket.instances.length;
    MockWebSocket.instances[socketsAfterCap - 1].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_MAX_MS);

    expect(MockWebSocket.instances).toHaveLength(
      PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS + 1,
    );
  });

  it('cancels a pending reconnect when disconnect is called', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    openAndWelcome();
    MockWebSocket.instances[0].onclose?.();

    client.disconnect();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('opens a new socket when subscribe is called for already-watched Events after the socket is closed', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();
    socket.readyState = 3;

    client.subscribe(venueId, [eventId]);
    const nextSocket = openAndWelcome(MockWebSocket.instances[1]);

    expect(MockWebSocket.instances).toHaveLength(2);
    expect(nextSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('preserves a path prefix on the API base URL', () => {
    const client = new PredictLiveDataClient({
      baseUrl: 'https://predict.example/predict',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);

    expect(MockWebSocket.instances[0].url).toBe(
      'wss://predict.example/predict/v1/stream/live-data',
    );
  });

  it('does not open a socket when the API URL is not configured', () => {
    const client = new PredictLiveDataClient({
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not open a socket when the API URL is malformed', () => {
    const client = new PredictLiveDataClient({
      baseUrl: 'not a URL',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not open a new socket after disconnect', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);

    client.disconnect();

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('ignores malformed frames', () => {
    const onGameUpdate = jest.fn();
    const client = createClient(onGameUpdate);
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();

    socket.message({ type: 'game', game: { eventId } });

    expect(onGameUpdate).not.toHaveBeenCalled();
  });

  it('returns no released ids when unsubscribing an Event that was never watched', () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();
    socket.send.mockClear();

    const released = client.unsubscribe(venueId, [
      'KXOTHER' as PredictEntityId,
    ]);

    expect(released).toEqual([]);
    expect(socket.send).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('logs server error frames without forwarding a Game update', () => {
    const onGameUpdate = jest.fn();
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient(onGameUpdate);
    client.subscribe(venueId, [eventId]);
    const socket = openAndWelcome();

    socket.message({
      type: 'error',
      code: 'SUBSCRIPTION_LIMIT',
      message: 'too many events',
    });

    expect(onGameUpdate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: server error',
      'SUBSCRIPTION_LIMIT',
      'too many events',
    );
  });

  it('stops connecting after a protocol version mismatch', () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message({ type: 'welcome', protocol: 2 });
    client.subscribe(venueId, [eventId]);
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: unsupported live-data protocol',
      2,
    );
  });

  it('logs once when the stream URL is not configured', () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = new PredictLiveDataClient({
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    client.subscribe(venueId, [eventId]);

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: stream URL is missing or invalid',
    );
  });
});
