import type { AppStateStatus } from 'react-native';
import Logger from '../../../../../util/Logger';
import type { PredictEntityId, PredictVenueId } from '../../types';
import {
  PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION,
  PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS,
  PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS,
  PREDICT_LIVE_DATA_RECONNECT_BASE_MS,
  PREDICT_LIVE_DATA_RECONNECT_MAX_MS,
  PREDICT_LIVE_DATA_UNAUTHORIZED_CLOSE_CODE,
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
  onclose: ((event?: { code?: number }) => void) | null = null;
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

const createAppState = () => {
  let onChange: ((state: AppStateStatus) => void) | undefined;
  const remove = jest.fn();
  return {
    addEventListener: jest.fn(
      (_type: 'change', listener: (state: AppStateStatus) => void) => {
        onChange = listener;
        return { remove };
      },
    ),
    change: (state: AppStateStatus) => onChange?.(state),
    remove,
  };
};

const createClient = (
  onGameUpdate = jest.fn(),
  appState = createAppState(),
  getBearerToken: () => Promise<string | undefined> = async () => 'test-token',
) =>
  new PredictLiveDataClient({
    baseUrl: 'http://localhost:3333',
    getBearerToken,
    WebSocket: MockWebSocket as unknown as typeof WebSocket,
    AppState: appState,
    onGameUpdate,
  });

// Connecting resolves a bearer token before opening the socket. Fake timers
// leave the microtask queue live, so a few awaits settle the token chain.
const flushConnect = async (): Promise<void> => {
  for (let tick = 0; tick < 5; tick += 1) {
    await Promise.resolve();
  }
};

const openAndWelcome = (socket = MockWebSocket.instances[0]): MockWebSocket => {
  socket.open();
  socket.message(welcomeFrame);
  return socket;
};

describe('PredictLiveDataClient', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    MockWebSocket.instances = [];
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('connects with the bearer token as a token query parameter', async () => {
    const client = createClient();

    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    expect(socket.url).toBe(
      'ws://localhost:3333/v1/stream/live-data?token=test-token',
    );
    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('does not connect without a token, then connects once one is available', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const getBearerToken = jest
      .fn<Promise<string | undefined>, []>()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValue('late-token');
    const client = createClient(jest.fn(), createAppState(), getBearerToken);

    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: no bearer token available for stream',
    );

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      'ws://localhost:3333/v1/stream/live-data?token=late-token',
    );
  });

  it('treats a rejecting token provider as a missing token', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient(jest.fn(), createAppState(), async () => {
      throw new Error('wallet is locked');
    });

    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: no bearer token available for stream',
    );
  });

  it('fetches a fresh token for every connection attempt', async () => {
    const getBearerToken = jest
      .fn<Promise<string | undefined>, []>()
      .mockResolvedValueOnce('first-token')
      .mockResolvedValue('second-token');
    const client = createClient(jest.fn(), createAppState(), getBearerToken);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();

    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();

    expect(getBearerToken).toHaveBeenCalledTimes(2);
    expect(MockWebSocket.instances[1].url).toBe(
      'ws://localhost:3333/v1/stream/live-data?token=second-token',
    );
  });

  it('does not open a socket when disconnect happens while the token resolves', async () => {
    const client = createClient();

    client.subscribe(venueId, [eventId]);
    client.disconnect();
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not open a socket when the app backgrounds while the token resolves', async () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);

    client.subscribe(venueId, [eventId]);
    appState.change('background');
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('connects on foreground after backgrounding during an in-flight token fetch', async () => {
    let resolveFirstToken: (value: string | undefined) => void = () =>
      undefined;
    const getBearerToken = jest
      .fn<Promise<string | undefined>, []>()
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstToken = resolve;
          }),
      )
      .mockResolvedValue('fresh-token');
    const appState = createAppState();
    const client = createClient(jest.fn(), appState, getBearerToken);

    client.subscribe(venueId, [eventId]);
    appState.change('background');
    appState.change('active');
    await flushConnect();
    resolveFirstToken('stale-token');
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      'ws://localhost:3333/v1/stream/live-data?token=fresh-token',
    );
  });

  it('opens a socket when subscribe follows disconnect during an in-flight token fetch', async () => {
    const client = createClient();

    client.subscribe(venueId, [eventId]);
    client.disconnect();
    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('logs an unauthorized close and reconnects with a fresh token', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();

    MockWebSocket.instances[0].onclose?.({
      code: PREDICT_LIVE_DATA_UNAUTHORIZED_CLOSE_CODE,
    });

    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: connection closed as unauthorized; a fresh token is fetched on reconnect',
    );

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('subscribes to game updates after the welcome frame', async () => {
    const client = createClient();

    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    expect(socket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('forwards game and game_snapshot frames and disconnects after the linger', async () => {
    const onGameUpdate = jest.fn();
    const client = new PredictLiveDataClient({
      baseUrl: 'https://predict.example',
      getBearerToken: async () => 'test-token',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate,
    });
    client.subscribe(venueId, [eventId]);
    await flushConnect();
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

  it('does not forward game frames after the last watcher releases the Event', async () => {
    const onGameUpdate = jest.fn();
    const client = createClient(onGameUpdate);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();
    const game = {
      venueId,
      eventId,
      type: 'football_game',
      details: { home_points: 7 },
    };

    client.unsubscribe(venueId, [eventId]);
    onGameUpdate.mockClear();
    socket.message({ type: 'game', game });
    socket.message({ type: 'game_snapshot', game });

    expect(onGameUpdate).not.toHaveBeenCalled();
  });

  it('keeps an Event subscribed while another watcher still holds it', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
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

  it('keeps the socket open when a new subscribe arrives during the linger', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();
    client.unsubscribe(venueId, [eventId]);
    socket.send.mockClear();

    client.subscribe(venueId, [eventId]);
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);
    await flushConnect();

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

  it('reconnects with backoff and resubscribes after the socket closes while Events are still watched', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    socket.onclose?.();

    expect(MockWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS - 1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);

    jest.advanceTimersByTime(1);
    await flushConnect();
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

  it('doubles the reconnect delay after a second close', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();

    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();
    MockWebSocket.instances[1].onclose?.();

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS * 2 - 1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('resets reconnect backoff after a welcome frame', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();
    MockWebSocket.instances[0].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();
    openAndWelcome(MockWebSocket.instances[1]);
    MockWebSocket.instances[1].onclose?.();

    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS - 1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(2);

    jest.advanceTimersByTime(1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(3);
  });

  it('keeps reconnecting at the max delay after the attempt cap', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();

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
      await flushConnect();
    }

    const socketsAfterCap = MockWebSocket.instances.length;
    MockWebSocket.instances[socketsAfterCap - 1].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_MAX_MS - 1);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(socketsAfterCap);

    jest.advanceTimersByTime(1);
    await flushConnect();
    MockWebSocket.instances[socketsAfterCap].onclose?.();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_MAX_MS);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(socketsAfterCap + 2);
    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: capping reconnect delay after max attempts',
    );
  });

  it('opens a new socket immediately when subscribe is called after the reconnect cap', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();

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
      await flushConnect();
    }

    MockWebSocket.instances[MockWebSocket.instances.length - 1].onclose?.();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const nextSocket = openAndWelcome(
      MockWebSocket.instances[MockWebSocket.instances.length - 1],
    );

    expect(MockWebSocket.instances).toHaveLength(
      PREDICT_LIVE_DATA_MAX_RECONNECT_ATTEMPTS + 2,
    );
    expect(nextSocket.send).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventId],
      }),
    );
  });

  it('cancels a pending reconnect when disconnect is called', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();
    MockWebSocket.instances[0].onclose?.();

    client.disconnect();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('opens a new socket when subscribe is called for already-watched Events after the socket is closed', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();
    socket.readyState = 3;

    client.subscribe(venueId, [eventId]);
    await flushConnect();
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

  it('preserves a path prefix on the API base URL', async () => {
    const client = new PredictLiveDataClient({
      baseUrl: 'https://predict.example/predict',
      getBearerToken: async () => 'test-token',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances[0].url).toBe(
      'wss://predict.example/predict/v1/stream/live-data?token=test-token',
    );
  });

  it('does not open a socket when the API URL is not configured', async () => {
    const client = new PredictLiveDataClient({
      getBearerToken: async () => 'test-token',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not open a socket when the API URL is malformed', async () => {
    const client = new PredictLiveDataClient({
      baseUrl: 'not a URL',
      getBearerToken: async () => 'test-token',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not open a new socket after disconnect', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();

    client.disconnect();
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_MAX_MS);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('ignores malformed frames', async () => {
    const onGameUpdate = jest.fn();
    const client = createClient(onGameUpdate);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    socket.message({ type: 'game', game: { eventId } });

    expect(onGameUpdate).not.toHaveBeenCalled();
  });

  it('returns no released ids when unsubscribing an Event that was never watched', async () => {
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();
    socket.send.mockClear();

    const released = client.unsubscribe(venueId, [
      'KXOTHER' as PredictEntityId,
    ]);

    expect(released).toEqual([]);
    expect(socket.send).not.toHaveBeenCalled();
    expect(socket.close).not.toHaveBeenCalled();
  });

  it('logs server error frames without forwarding a Game update', async () => {
    const onGameUpdate = jest.fn();
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient(onGameUpdate);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
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

  it('stops connecting after a protocol version mismatch', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = createClient();
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message({ type: 'welcome', protocol: 2 });
    client.subscribe(venueId, [eventId]);
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_BASE_MS);
    await flushConnect();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(1);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: unsupported live-data protocol',
      2,
    );
  });

  it('logs once when the stream URL is not configured', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const client = new PredictLiveDataClient({
      getBearerToken: async () => 'test-token',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    client.subscribe(venueId, [eventId]);
    await flushConnect();

    expect(log).toHaveBeenCalledTimes(1);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: stream URL is missing or invalid',
    );
  });

  it('caps game subscribes at the welcome maxPerConnection and fills freed slots', async () => {
    const log = jest.spyOn(Logger, 'log').mockImplementation(jest.fn());
    const eventIds = Array.from(
      { length: PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION + 1 },
      (_, index) => `KX-${index}` as PredictEntityId,
    );
    const client = createClient();
    client.subscribe(venueId, eventIds);
    await flushConnect();
    const socket = openAndWelcome();

    expect(
      JSON.parse(socket.send.mock.calls[0][0] as string).events,
    ).toHaveLength(PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION);
    expect(log).toHaveBeenCalledWith(
      'PredictLiveDataClient: truncating game subscribe to connection limit',
      eventIds.length,
      PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION,
      PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION,
    );

    socket.send.mockClear();
    client.unsubscribe(venueId, [eventIds[0]]);

    expect(socket.send).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({
        type: 'unsubscribe',
        topic: 'game',
        venueId,
        events: [eventIds[0]],
      }),
    );
    expect(socket.send).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: [eventIds[PREDICT_LIVE_DATA_DEFAULT_GAME_MAX_PER_CONNECTION]],
      }),
    );
  });

  it('chunks subscribe messages using the welcome maxPerMessage', async () => {
    const client = createClient();
    client.subscribe(venueId, [
      'KX-1' as PredictEntityId,
      'KX-2' as PredictEntityId,
      'KX-3' as PredictEntityId,
    ]);
    await flushConnect();
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message({
      ...welcomeFrame,
      limits: {
        ...welcomeFrame.limits,
        game: { maxPerConnection: 50, maxPerMessage: 2 },
      },
    });

    expect(socket.send).toHaveBeenNthCalledWith(
      1,
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: ['KX-1', 'KX-2'],
      }),
    );
    expect(socket.send).toHaveBeenNthCalledWith(
      2,
      JSON.stringify({
        type: 'subscribe',
        topic: 'game',
        venueId,
        events: ['KX-3'],
      }),
    );
  });

  it('closes the socket on background and does not reconnect until foreground', async () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    appState.change('background');
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_RECONNECT_MAX_MS);
    await flushConnect();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect(MockWebSocket.instances).toHaveLength(1);

    appState.change('active');
    await flushConnect();
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

  it('does not reconnect on foreground when no Events are watched', async () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();
    client.unsubscribe(venueId, [eventId]);

    appState.change('background');
    appState.change('active');
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('does not close the socket on inactive', async () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    const socket = openAndWelcome();

    appState.change('inactive');

    expect(socket.close).not.toHaveBeenCalled();
    expect(MockWebSocket.instances).toHaveLength(1);
  });

  it('does not open a socket on subscribe while backgrounded', async () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);
    client.subscribe(venueId, [eventId]);
    await flushConnect();
    openAndWelcome();
    appState.change('background');

    client.subscribe(venueId, ['KX-NEXT' as PredictEntityId]);
    await flushConnect();

    expect(MockWebSocket.instances).toHaveLength(1);

    appState.change('active');
    await flushConnect();
    const nextSocket = openAndWelcome(MockWebSocket.instances[1]);

    expect(
      JSON.parse(nextSocket.send.mock.calls[0][0] as string).events,
    ).toEqual([eventId, 'KX-NEXT']);
  });

  it('removes the AppState listener on destroy', () => {
    const appState = createAppState();
    const client = createClient(jest.fn(), appState);

    client.destroy();

    expect(appState.remove).toHaveBeenCalledTimes(1);
  });
});
