import {
  buildPredictNextIntegrationHarness as createPredictNextIntegrationHarness,
  type PredictLiveDataFakeSocket,
  type PredictNextIntegrationHarness,
} from '../../../../../tests/integration/harnesses/predict-next';
import { PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS } from '../adapters/remote/PredictLiveDataClient';
import { KALSHI_VENUE_ID, type PredictEntityId } from '../types';

const id = (value: string) => value as PredictEntityId;

const market = (marketId: string) => ({
  id: marketId,
  question: marketId,
  status: 'active',
  outcomes: [
    { id: `${marketId}:yes`, side: 'yes', label: 'Yes', askPrice: '0.42' },
    { id: `${marketId}:no`, side: 'no', label: 'No', askPrice: '0.61' },
  ],
});

const game = (status: string, startsAt: string) => ({
  startsAt,
  sports: {
    sport: { id: 'american-football', label: 'American football' },
    game: {
      status,
      homeTeam: { name: 'Home' },
      awayTeam: { name: 'Away' },
      observedAt: '2026-09-08T12:00:00.000Z',
    },
  },
});

/** Feed cards: two Markets each, no Game. */
const feedEvents = {
  'event-1': {
    venueId: 'kalshi',
    id: 'event-1',
    title: 'Event 1',
    markets: [market('e1-m1'), market('e1-m2')],
  },
  'event-2': {
    venueId: 'kalshi',
    id: 'event-2',
    title: 'Event 2',
    markets: [market('e2-m1'), market('e2-m2')],
  },
  'event-3': {
    venueId: 'kalshi',
    id: 'event-3',
    title: 'Event 3',
    markets: [market('e3-m1'), market('e3-m2'), market('e3-m3')],
  },
  'live-game': {
    venueId: 'kalshi',
    id: 'live-game',
    title: 'Live game',
    ...game('in_progress', '2026-09-08T11:00:00.000Z'),
    markets: [market('lg-m1')],
  },
  'future-game': {
    venueId: 'kalshi',
    id: 'future-game',
    title: 'Future game',
    ...game('scheduled', '2999-01-01T00:00:00.000Z'),
    markets: [market('fg-m1')],
  },
};

const marketIds = (eventId: keyof typeof feedEvents) =>
  feedEvents[eventId].markets.map(({ id: marketId }) => marketId);

// The client resolves a bearer token before opening the socket, and the
// service resolves the Event through the REST read; a few awaits settle both.
const settle = async (): Promise<void> => {
  for (let tick = 0; tick < 10; tick += 1) {
    await Promise.resolve();
  }
  await new Promise<void>((resolve) => setImmediate(resolve));
};

const watch = (harness: PredictNextIntegrationHarness, ...ids: string[]) =>
  harness.messenger.call(
    'PredictLiveDataService:watchEvents',
    KALSHI_VENUE_ID,
    ids.map(id),
  );

const unwatch = (harness: PredictNextIntegrationHarness, ...ids: string[]) =>
  harness.messenger.call(
    'PredictLiveDataService:unwatchEvents',
    KALSHI_VENUE_ID,
    ids.map(id),
  );

const openAndWelcome = async (
  harness: PredictNextIntegrationHarness,
  limits?: Parameters<PredictLiveDataFakeSocket['welcome']>[0],
): Promise<PredictLiveDataFakeSocket> => {
  await settle();
  const socket = harness.sockets[harness.sockets.length - 1];
  socket.open();
  socket.welcome(limits);
  return socket;
};

describe('PredictNext live-data subscriptions', () => {
  const harnesses: PredictNextIntegrationHarness[] = [];
  const buildHarness = () => {
    const harness = createPredictNextIntegrationHarness((url) => {
      const match = /\/events\/([^/?]+)/u.exec(url);
      const event = match
        ? feedEvents[match[1] as keyof typeof feedEvents]
        : undefined;
      return event ? { body: event } : { status: 404 };
    });
    harnesses.push(harness);
    return harness;
  };

  beforeEach(() => {
    // Timers drive linger/reconnect; the promise plumbing stays real.
    jest.useFakeTimers({
      doNotFake: ['setImmediate', 'nextTick', 'queueMicrotask'],
    });
  });

  afterEach(() => {
    harnesses.splice(0).forEach((harness) => harness.destroy());
    jest.useRealTimers();
  });

  it('subscribes and unsubscribes Feed cards as they scroll in and out', async () => {
    const harness = buildHarness();

    // First page: card 1 is on screen.
    watch(harness, 'event-1');
    const socket = await openAndWelcome(harness);
    await settle();

    expect(socket.subscribedIds('market')).toEqual(marketIds('event-1'));
    expect(socket.subscribedIds('game')).toEqual([]);

    // Scroll: card 1 leaves, card 2 enters.
    unwatch(harness, 'event-1');
    watch(harness, 'event-2');
    await settle();

    expect(socket.subscribedIds('market')).toEqual(marketIds('event-2'));
    expect(socket.sent).toEqual([
      {
        type: 'subscribe',
        topic: 'market',
        venueId: 'kalshi',
        markets: marketIds('event-1'),
      },
      {
        type: 'unsubscribe',
        topic: 'market',
        venueId: 'kalshi',
        markets: marketIds('event-1'),
      },
      {
        type: 'subscribe',
        topic: 'market',
        venueId: 'kalshi',
        markets: marketIds('event-2'),
      },
    ]);

    // Scroll back: card 1 is resolved from the REST cache, not refetched.
    const eventReads = () =>
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/events/event-1'),
      ).length;
    const readsBefore = eventReads();
    watch(harness, 'event-1');
    await settle();

    expect(eventReads()).toBe(readsBefore);
    expect(socket.subscribedIds('market')).toEqual([
      ...marketIds('event-2'),
      ...marketIds('event-1'),
    ]);
  });

  it('holds exactly one upstream subscription for an Event visible on Home and Feed', async () => {
    const harness = buildHarness();

    watch(harness, 'event-1'); // Home
    watch(harness, 'event-1'); // Feed
    const socket = await openAndWelcome(harness);
    await settle();

    const subscribes = () =>
      socket.sent.filter((frame) => frame.type === 'subscribe');
    expect(subscribes()).toHaveLength(1);
    expect(socket.subscribedIds('market')).toEqual(marketIds('event-1'));
    expect(
      harness.fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/events/event-1'),
      ),
    ).toHaveLength(1);

    // Home scrolls it out: Feed still holds it.
    unwatch(harness, 'event-1');
    await settle();
    expect(socket.subscribedIds('market')).toEqual(marketIds('event-1'));
    expect(socket.sent.filter((frame) => frame.type === 'unsubscribe')).toEqual(
      [],
    );

    // Feed leaves too: the upstream subscription is released once.
    unwatch(harness, 'event-1');
    await settle();
    expect(socket.subscribedIds('market')).toEqual([]);
    expect(socket.sent.filter((frame) => frame.type === 'unsubscribe')).toEqual(
      [
        {
          type: 'unsubscribe',
          topic: 'market',
          venueId: 'kalshi',
          markets: marketIds('event-1'),
        },
      ],
    );
  });

  it('leaves zero active subscriptions after the Event Screen unmounts', async () => {
    const harness = buildHarness();

    watch(harness, 'live-game');
    const socket = await openAndWelcome(harness);
    await settle();
    expect(socket.subscribedIds('market')).toEqual(marketIds('live-game'));
    expect(socket.subscribedIds('game')).toEqual(['live-game']);

    unwatch(harness, 'live-game');
    await settle();

    expect(socket.subscribedIds('market')).toEqual([]);
    expect(socket.subscribedIds('game')).toEqual([]);
    expect(harness.liveDataService.watchedEventIds).toEqual([]);

    // With nothing watched the connection is dropped after the linger window.
    jest.advanceTimersByTime(PREDICT_LIVE_DATA_DISCONNECT_LINGER_MS);
    expect(socket.readyState).toBe(3);
  });

  it('subscribes the game subject only for live Games or Games inside the window', async () => {
    const harness = buildHarness();

    watch(harness, 'live-game', 'future-game');
    const socket = await openAndWelcome(harness);
    await settle();

    expect(socket.subscribedIds('game')).toEqual(['live-game']);
    expect(socket.subscribedIds('market')).toEqual([
      ...marketIds('live-game'),
      ...marketIds('future-game'),
    ]);
  });

  it('degrades deterministically when the visible set exceeds the market cap', async () => {
    const harness = buildHarness();

    // Three cards on screen, seven Markets, but the gateway allows four.
    watch(harness, 'event-3', 'event-1', 'event-2');
    const socket = await openAndWelcome(harness, {
      market: { maxPerConnection: 4, maxPerMessage: 100 },
    });
    await settle();

    // Earliest-watched Events win, Markets in each Event's own order.
    expect(socket.subscribedIds('market')).toEqual([
      ...marketIds('event-3'),
      'e1-m1',
    ]);

    // Releasing the first card frees slots that are filled in watch order,
    // so the rest of event-1 and then event-2 come in.
    unwatch(harness, 'event-3');
    await settle();

    expect(socket.subscribedIds('market')).toEqual([
      'e1-m1',
      'e1-m2',
      'e2-m1',
      'e2-m2',
    ]);
    expect(harness.liveDataService.watchedEventIds).toEqual([
      id('event-1'),
      id('event-2'),
    ]);
  });

  it('drops the connection in the background and resubscribes the visible set on foreground', async () => {
    const harness = buildHarness();

    watch(harness, 'live-game', 'event-1');
    const first = await openAndWelcome(harness);
    await settle();
    expect(first.subscribedIds('market')).toEqual([
      ...marketIds('live-game'),
      ...marketIds('event-1'),
    ]);

    harness.setAppState('background');
    expect(first.readyState).toBe(3);
    expect(harness.sockets).toHaveLength(1);

    harness.setAppState('active');
    const second = await openAndWelcome(harness);
    await settle();

    expect(harness.sockets).toHaveLength(2);
    expect(second.subscribedIds('market')).toEqual([
      ...marketIds('live-game'),
      ...marketIds('event-1'),
    ]);
    expect(second.subscribedIds('game')).toEqual(['live-game']);
  });
});
