import type { PredictEntityId, PredictVenueId } from '../../types';
import { PredictLiveDataClient } from './PredictLiveDataClient';

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
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = 3;
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

describe('PredictLiveDataClient', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
  });

  it('subscribes to game updates after the welcome frame', () => {
    const client = new PredictLiveDataClient({
      baseUrl: 'http://localhost:3333',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate: jest.fn(),
    });

    client.subscribe(venueId, [eventId]);
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.message(welcomeFrame);

    expect(socket.url).toBe(
      'ws://localhost:3333/v1/stream/live-data',
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

  it('forwards game and game_snapshot frames and disconnects after the last unsubscribe', () => {
    const onGameUpdate = jest.fn();
    const client = new PredictLiveDataClient({
      baseUrl: 'https://predict.example',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate,
    });
    client.subscribe(venueId, [eventId]);
    const socket = MockWebSocket.instances[0];
    socket.open();
    socket.message(welcomeFrame);
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
    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('ignores malformed frames', () => {
    const onGameUpdate = jest.fn();
    const client = new PredictLiveDataClient({
      baseUrl: 'http://localhost:3333',
      WebSocket: MockWebSocket as unknown as typeof WebSocket,
      onGameUpdate,
    });
    client.subscribe(venueId, [eventId]);
    const socket = MockWebSocket.instances[0];
    socket.open();

    socket.message({ type: 'game', game: { eventId } });

    expect(onGameUpdate).not.toHaveBeenCalled();
  });
});
