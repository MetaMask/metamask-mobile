import { captureMessage } from '@sentry/react-native';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import {
  POLYBOLT_WS_URL,
  PolyBoltCryptoFeed,
  toPolyboltFilter,
  toPolyboltWireSymbol,
  type PolyBoltCredentials,
  type PolyBoltSubscription,
} from './polyboltCryptoFeed';

const credentials: PolyBoltCredentials = {
  apiKey: 'key',
  secret: 'secret',
  passphrase: 'pass',
};

let mockSockets: MockSocket[] = [];

class MockSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;

  url: string;
  readyState = MockSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: { code?: number }) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.({ code: 1000 });
  });

  constructor(url: string) {
    this.url = url;
    mockSockets.push(this);
  }

  open(): void {
    this.readyState = MockSocket.OPEN;
    this.onopen?.();
  }

  receive(data: object): void {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  closeWith(code: number): void {
    this.readyState = MockSocket.CLOSED;
    this.onclose?.({ code });
  }
}

const listener = () => ({
  onSnapshot: jest.fn(),
  onLive: jest.fn(),
  onConnectionChange: jest.fn(),
});

describe('toPolyboltWireSymbol', () => {
  it('converts a caller symbol to a lowercase usd symbol', () => {
    expect(toPolyboltWireSymbol('btc/usd')).toBe('btcusd');
    expect(toPolyboltWireSymbol('ETH/USD')).toBe('ethusd');
  });

  it('rejects a symbol that is not a usd pair', () => {
    expect(toPolyboltWireSymbol('btcusdt')).toBeUndefined();
    expect(toPolyboltWireSymbol('BTCUSD')).toBeUndefined();
  });
});

describe('toPolyboltFilter', () => {
  it('names Chainlink for a market without a pin', () => {
    expect(toPolyboltFilter('price.crypto', 'btcusd')).toEqual({
      symbol: 'btcusd',
      provider: 'chainlink',
    });
  });

  it('names Chainlink for a Chainlink market', () => {
    expect(toPolyboltFilter('price.crypto', 'btcusd', 'chainlink')).toEqual({
      symbol: 'btcusd',
      provider: 'chainlink',
    });
  });

  it('pins Binance for a Binance market', () => {
    expect(toPolyboltFilter('price.crypto', 'btcusd', 'binance')).toEqual({
      symbol: 'btcusd',
      provider: 'binance',
    });
  });

  it('names Chainlink on the TWAP channel, which only Chainlink serves', () => {
    expect(toPolyboltFilter('price.crypto.twap', 'btcusd')).toEqual({
      symbol: 'btcusd',
      window_seconds: 60,
      provider: 'chainlink',
    });
    expect(toPolyboltFilter('price.crypto.twap', 'btcusd', 'binance')).toEqual({
      symbol: 'btcusd',
      window_seconds: 60,
      provider: 'chainlink',
    });
  });
});

describe('PolyBoltCryptoFeed', () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    mockSockets = [];
    jest.useFakeTimers();
    jest
      .spyOn(global.crypto, 'getRandomValues')
      .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
        (array as unknown as Uint32Array).fill(0);
        return array;
      });
    (global as unknown as { WebSocket: typeof MockSocket }).WebSocket =
      MockSocket;
    jest.spyOn(Logger, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    global.WebSocket = originalWebSocket;
  });

  const connectAuthedFeed = (
    feed: PolyBoltCryptoFeed,
    handlers = listener(),
  ) => {
    feed.setCredentials(credentials);
    feed.setSubscriptions([
      {
        channel: 'price.crypto',
        callerSymbol: 'btc/usd',
        wireSymbol: 'btcusd',
      },
    ]);
    const socket = mockSockets[0];
    socket.open();
    const authFrame = JSON.parse(socket.send.mock.calls[0][0] as string) as {
      rid: string;
    };
    socket.receive({ op: 'authed', rid: authFrame.rid });
    return { socket, handlers };
  };

  const chainlinkBtc: PolyBoltSubscription = {
    channel: 'price.crypto',
    callerSymbol: 'btc/usd',
    wireSymbol: 'btcusd',
  };
  const binanceBtc: PolyBoltSubscription = {
    ...chainlinkBtc,
    provider: 'binance',
  };

  const sentFrames = (socket: MockSocket) =>
    socket.send.mock.calls.map(
      ([frame]) =>
        JSON.parse(frame as string) as {
          op: string;
          rid: string;
          subscriptions?: { channel: string; filter: object }[];
        },
    );

  const connectWith = (
    subscriptions: PolyBoltSubscription[],
    handlers = listener(),
    feedCredentials: PolyBoltCredentials = credentials,
  ) => {
    const feed = new PolyBoltCryptoFeed(handlers);
    feed.setCredentials(feedCredentials);
    feed.setSubscriptions(subscriptions);
    const socket = mockSockets[0];
    socket.open();
    socket.receive({ op: 'authed', rid: sentFrames(socket)[0].rid });
    return { feed, socket, handlers };
  };

  const livePoint = (source: string, value: string) => ({
    v: 1,
    channel: 'price.crypto',
    seq: 1,
    ts: 1,
    payload: {
      symbol: 'btcusd',
      value: Number(value),
      full_accuracy_value: value,
      timestamp: 1_000,
      source,
    },
  });

  it('authenticates before it subscribes and does not send a text ping', () => {
    const handlers = listener();
    const feed = new PolyBoltCryptoFeed(handlers);
    feed.setCredentials(credentials);
    feed.setSubscriptions([
      {
        channel: 'price.crypto.twap',
        callerSymbol: 'btc/usd',
        wireSymbol: 'btcusd',
      },
    ]);

    expect(mockSockets[0].url).toBe(POLYBOLT_WS_URL);
    mockSockets[0].open();
    expect(mockSockets[0].send).toHaveBeenCalledTimes(1);
    const authFrame = JSON.parse(
      mockSockets[0].send.mock.calls[0][0] as string,
    ) as { op: string; auth: PolyBoltCredentials };
    expect(authFrame.op).toBe('auth');
    expect(authFrame.auth).toEqual(credentials);

    jest.advanceTimersByTime(30_000);
    expect(mockSockets[0].send).not.toHaveBeenCalledWith('ping');

    mockSockets[0].receive({ op: 'authed', rid: 'a1' });
    const subscribeFrame = JSON.parse(
      mockSockets[0].send.mock.calls[1][0] as string,
    );
    expect(subscribeFrame).toEqual({
      op: 'subscribe',
      rid: 's2',
      subscriptions: [
        {
          channel: 'price.crypto.twap',
          filter: {
            symbol: 'btcusd',
            window_seconds: 60,
            provider: 'chainlink',
          },
        },
      ],
    });
  });

  it('emits snapshot points oldest first using full_accuracy_value', () => {
    const handlers = listener();
    const feed = new PolyBoltCryptoFeed(handlers);
    const { socket } = connectAuthedFeed(feed);

    socket.receive({
      v: 1,
      channel: 'price.crypto',
      snapshot: true,
      payload: {
        symbol: 'btcusd',
        source: 'chainlink',
        data: [
          { timestamp: 20, full_accuracy_value: '11.25' },
          { timestamp: 10, full_accuracy_value: '10.5' },
        ],
      },
    });

    expect(handlers.onSnapshot).toHaveBeenCalledWith('price.crypto', [
      { symbol: 'btc/usd', price: 10.5, timestamp: 10 },
      { symbol: 'btc/usd', price: 11.25, timestamp: 20 },
    ]);
  });

  it('does not reconnect after close 4001', () => {
    const feed = new PolyBoltCryptoFeed(listener());
    const { socket } = connectAuthedFeed(feed);

    socket.closeWith(4001);
    jest.advanceTimersByTime(60_000);

    expect(mockSockets).toHaveLength(1);
  });

  it('reconnects after close 1006 with backoff', () => {
    const feed = new PolyBoltCryptoFeed(listener());
    const { socket } = connectAuthedFeed(feed);

    socket.closeWith(1006);
    expect(mockSockets).toHaveLength(1);

    jest.advanceTimersByTime(999);
    expect(mockSockets).toHaveLength(1);
    jest.advanceTimersByTime(1);
    expect(mockSockets).toHaveLength(2);
    expect(mockSockets[1].url).toBe(POLYBOLT_WS_URL);
  });

  it('does not send auth again after auth_invalid', () => {
    const feed = new PolyBoltCryptoFeed(listener());
    const { socket } = connectAuthedFeed(feed);
    socket.send.mockClear();

    socket.receive({ op: 'error', code: 'auth_invalid' });
    jest.advanceTimersByTime(60_000);

    expect(socket.send).not.toHaveBeenCalled();
    expect(mockSockets).toHaveLength(1);
  });
  describe('provider pins', () => {
    it('subscribes a Chainlink and a Binance market on one symbol side by side', () => {
      const { socket } = connectWith([chainlinkBtc, binanceBtc]);

      const subscribes = sentFrames(socket).filter(
        (frame) => frame.op === 'subscribe',
      );
      expect(subscribes).toEqual([
        {
          op: 'subscribe',
          rid: 's2',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'chainlink' },
            },
          ],
        },
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'binance' },
            },
          ],
        },
      ]);
    });

    it('gives each subscription the prices of its own provider', () => {
      const { socket, handlers } = connectWith([chainlinkBtc, binanceBtc]);
      socket.receive({ op: 'subscribed', channel: 'price.crypto', rid: 's2' });
      socket.receive({
        op: 'subscribed',
        channel: 'price.crypto',
        rid: 's3',
        provider: 'binance',
      });

      socket.receive(livePoint('chainlink', '100'));
      socket.receive(livePoint('binance', '101'));

      expect(handlers.onLive).toHaveBeenCalledTimes(2);
      expect(handlers.onLive).toHaveBeenNthCalledWith(1, 'price.crypto', {
        symbol: 'btc/usd',
        price: 100,
        timestamp: 1_000,
      });
      expect(handlers.onLive).toHaveBeenNthCalledWith(
        2,
        'price.crypto',
        { symbol: 'btc/usd', price: 101, timestamp: 1_000 },
        'binance',
      );
    });

    it('unsubscribes only the pinned stream when the Binance market goes away', () => {
      const { feed, socket } = connectWith([chainlinkBtc, binanceBtc]);
      socket.send.mockClear();

      feed.setSubscriptions([chainlinkBtc]);

      expect(sentFrames(socket)).toEqual([
        {
          op: 'unsubscribe',
          rid: 'u4',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'binance' },
            },
          ],
        },
      ]);
    });

    it('resubscribes with Chainlink after a bad_filter so prices keep flowing', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket, handlers } = connectWith([binanceBtc]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's2',
      });

      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: filter rejected',
        expect.objectContaining({ rid: 's2', provider: 'binance' }),
      );
      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'chainlink' },
            },
          ],
        },
      ]);

      socket.receive(livePoint('chainlink', '100'));
      expect(handlers.onLive).toHaveBeenCalledWith(
        'price.crypto',
        { symbol: 'btc/usd', price: 100, timestamp: 1_000 },
        'binance',
      );
    });

    it('shares the existing unpinned stream after a bad_filter instead of subscribing twice', () => {
      const { socket, handlers } = connectWith([chainlinkBtc, binanceBtc]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's3',
      });
      socket.receive(livePoint('chainlink', '100'));

      expect(socket.send).not.toHaveBeenCalled();
      expect(handlers.onLive).toHaveBeenCalledTimes(2);
      expect(handlers.onLive).toHaveBeenCalledWith('price.crypto', {
        symbol: 'btc/usd',
        price: 100,
        timestamp: 1_000,
      });
      expect(handlers.onLive).toHaveBeenCalledWith(
        'price.crypto',
        { symbol: 'btc/usd', price: 100, timestamp: 1_000 },
        'binance',
      );
    });

    it('keeps the unpinned stream when a rejected pin is dropped later', () => {
      const { feed, socket } = connectWith([chainlinkBtc, binanceBtc]);
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's3',
      });
      socket.send.mockClear();

      feed.setSubscriptions([chainlinkBtc]);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('logs once when the ack names a different provider than requested', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket } = connectWith([binanceBtc]);

      socket.receive({
        op: 'subscribed',
        channel: 'price.crypto',
        rid: 's2',
        provider: 'chainlink',
      });
      socket.receive(livePoint('chainlink', '100'));
      socket.receive(livePoint('chainlink', '101'));

      const mismatchLogs = logSpy.mock.calls.filter(
        ([message]) =>
          message ===
          'PolyBoltCryptoFeed: served provider differs from request',
      );
      expect(mismatchLogs).toEqual([
        [
          'PolyBoltCryptoFeed: served provider differs from request',
          {
            channel: 'price.crypto',
            symbol: 'btcusd',
            requested: 'binance',
            served: 'chainlink',
          },
        ],
      ]);
    });

    it('treats an ack without a provider as an ignored pin', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket, handlers } = connectWith([chainlinkBtc, binanceBtc]);

      socket.receive({ op: 'subscribed', channel: 'price.crypto', rid: 's3' });
      socket.receive(livePoint('chainlink', '100'));

      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: served provider differs from request',
        expect.objectContaining({
          requested: 'binance',
          served: 'none named in ack',
        }),
      );
      expect(handlers.onLive).toHaveBeenCalledWith(
        'price.crypto',
        { symbol: 'btc/usd', price: 100, timestamp: 1_000 },
        'binance',
      );
    });

    it('logs once when payloads come from another provider than requested', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket, handlers } = connectWith([binanceBtc]);

      socket.receive(livePoint('chainlink', '100'));
      socket.receive(livePoint('chainlink', '101'));

      expect(handlers.onLive).toHaveBeenCalledTimes(2);
      expect(
        logSpy.mock.calls.filter(
          ([message]) =>
            message ===
            'PolyBoltCryptoFeed: served provider differs from request',
        ),
      ).toEqual([
        [
          'PolyBoltCryptoFeed: served provider differs from request',
          {
            channel: 'price.crypto',
            symbol: 'btcusd',
            requested: 'binance',
            served: 'chainlink',
          },
        ],
      ]);
    });

    it('does not log a mismatch for an unpinned subscription served by Chainlink', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket } = connectWith([chainlinkBtc]);

      socket.receive(livePoint('chainlink', '100'));

      expect(logSpy).not.toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: served provider differs from request',
        expect.anything(),
      );
    });

    it('tries the pin again on a new connection', () => {
      const { socket } = connectWith([chainlinkBtc, binanceBtc]);
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's3',
      });

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      const reconnected = mockSockets[1];
      reconnected.open();
      reconnected.receive({
        op: 'authed',
        rid: sentFrames(reconnected)[0].rid,
      });

      expect(
        sentFrames(reconnected)
          .filter((frame) => frame.op === 'subscribe')
          .map((frame) => frame.subscriptions),
      ).toEqual([
        [
          {
            channel: 'price.crypto',
            filter: { symbol: 'btcusd', provider: 'chainlink' },
          },
        ],
        [
          {
            channel: 'price.crypto',
            filter: { symbol: 'btcusd', provider: 'binance' },
          },
        ],
      ]);
    });
  });

  describe('provider enforcement', () => {
    const spot = (
      base: string,
      provider?: PolyBoltSubscription['provider'],
    ): PolyBoltSubscription => ({
      channel: 'price.crypto',
      callerSymbol: `${base}/usd`,
      wireSymbol: `${base}usd`,
      ...(provider && { provider }),
    });
    const twap = (base: string): PolyBoltSubscription => ({
      channel: 'price.crypto.twap',
      callerSymbol: `${base}/usd`,
      wireSymbol: `${base}usd`,
    });
    const subscribeFrames = (socket: MockSocket) =>
      sentFrames(socket).filter((frame) => frame.op === 'subscribe');
    const sentryCalls = () => jest.mocked(Logger.error).mock.calls;
    const keyRequired = (rid: string) => ({
      op: 'error',
      code: 'chainlink_key_required',
      status: 4010,
      channel: 'price.crypto',
      rid,
    });

    it('sends every Chainlink subscription, spot and TWAP, in one frame and each Binance pin in its own', () => {
      const { socket } = connectWith([
        spot('btc'),
        spot('eth', 'chainlink'),
        twap('btc'),
        spot('sol', 'binance'),
        spot('xrp', 'binance'),
      ]);

      expect(subscribeFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's2',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'chainlink' },
            },
            {
              channel: 'price.crypto',
              filter: { symbol: 'ethusd', provider: 'chainlink' },
            },
            {
              channel: 'price.crypto.twap',
              filter: {
                symbol: 'btcusd',
                window_seconds: 60,
                provider: 'chainlink',
              },
            },
          ],
        },
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'solusd', provider: 'binance' },
            },
          ],
        },
        {
          op: 'subscribe',
          rid: 's4',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'xrpusd', provider: 'binance' },
            },
          ],
        },
      ]);
    });

    it('shares one Chainlink stream between a market that names Chainlink and one that does not', () => {
      const named = spot('btc', 'chainlink');
      const { socket, handlers } = connectWith([spot('btc'), named]);

      expect(subscribeFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's2',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'chainlink' },
            },
          ],
        },
      ]);

      socket.receive(livePoint('chainlink', '100'));
      expect(handlers.onLive).toHaveBeenCalledWith('price.crypto', {
        symbol: 'btc/usd',
        price: 100,
        timestamp: 1_000,
      });
      expect(handlers.onLive).toHaveBeenCalledWith(
        'price.crypto',
        { symbol: 'btc/usd', price: 100, timestamp: 1_000 },
        'chainlink',
      );
    });

    it('sends 24 subscriptions in fewer than 20 frames, each naming a provider', () => {
      const bases = ['btc', 'eth', 'sol', 'xrp', 'doge', 'bnb', 'hype', 'ada'];
      const subscriptions = bases.flatMap((base) => [
        spot(base),
        twap(base),
        spot(base, 'binance'),
      ]);
      expect(subscriptions).toHaveLength(24);

      const { socket } = connectWith(subscriptions);

      const frames = subscribeFrames(socket);
      expect(frames.length).toBeLessThan(20);
      expect(frames).toHaveLength(1 + bases.length);
      const filters = frames.flatMap((frame) =>
        (frame.subscriptions ?? []).map(
          (subscription) => subscription.filter as { provider?: string },
        ),
      );
      expect(filters).toHaveLength(24);
      expect(filters.every((filter) => filter.provider)).toBe(true);
    });

    it('stops Chainlink subscriptions on chainlink_key_required and keeps Binance streaming', () => {
      const btc = spot('btc');
      const btcBinance = spot('btc', 'binance');
      const eth = spot('eth');
      const { feed, socket, handlers } = connectWith([btc, btcBinance, eth]);
      socket.receive({
        op: 'subscribed',
        channel: 'price.crypto',
        rid: 's3',
        provider: 'binance',
      });
      socket.send.mockClear();

      socket.receive(keyRequired('s2'));
      socket.receive(keyRequired('s2'));
      jest.advanceTimersByTime(60_000);

      expect(socket.send).not.toHaveBeenCalled();
      expect(mockSockets).toHaveLength(1);
      expect(feed.isConnected()).toBe(true);
      expect(sentryCalls()).toEqual([
        [
          new Error('PolyBoltCryptoFeed: chainlink_key_required'),
          {
            tags: { feature: 'Predict', provider: 'polymarket' },
            context: {
              name: 'PolyBoltCryptoFeed',
              data: {
                code: 'chainlink_key_required',
                status: 4010,
                channel: 'price.crypto',
                rid: 's2',
                hasChainlinkApiKey: false,
              },
            },
          },
        ],
      ]);

      socket.receive(livePoint('binance', '101'));
      expect(handlers.onLive).toHaveBeenCalledWith(
        'price.crypto',
        { symbol: 'btc/usd', price: 101, timestamp: 1_000 },
        'binance',
      );

      feed.setSubscriptions([btc, btcBinance, eth, spot('sol'), twap('sol')]);
      feed.setSubscriptions([
        btc,
        btcBinance,
        eth,
        spot('sol'),
        twap('sol'),
        spot('sol', 'binance'),
      ]);
      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's4',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'solusd', provider: 'binance' },
            },
          ],
        },
      ]);
    });

    it('subscribes Chainlink again on a new connection and reports the refusal once per connection', () => {
      const { socket } = connectWith([spot('btc')]);
      socket.receive(keyRequired('s2'));

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      const reconnected = mockSockets[1];
      reconnected.open();
      reconnected.receive({
        op: 'authed',
        rid: sentFrames(reconnected)[0].rid,
      });

      expect(subscribeFrames(reconnected)).toHaveLength(1);
      reconnected.receive(keyRequired(subscribeFrames(reconnected)[0].rid));
      expect(sentryCalls()).toHaveLength(2);
    });

    it('does not fall back to Chainlink after a bad_filter once Chainlink is unavailable', () => {
      const { socket } = connectWith([spot('btc'), spot('eth', 'binance')]);
      socket.receive(keyRequired('s2'));
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's3',
      });

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('logs provider_required once with the channel and rid and does not retry', () => {
      const { feed, socket } = connectWith([spot('btc')]);
      socket.send.mockClear();

      const providerRequired = {
        op: 'error',
        code: 'provider_required',
        status: 4011,
        channel: 'price.crypto',
        rid: 's2',
      };
      socket.receive(providerRequired);
      socket.receive(providerRequired);
      jest.advanceTimersByTime(60_000);

      expect(socket.send).not.toHaveBeenCalled();
      expect(mockSockets).toHaveLength(1);
      expect(feed.isConnected()).toBe(true);
      expect(sentryCalls()).toEqual([
        [
          new Error('PolyBoltCryptoFeed: provider_required'),
          expect.objectContaining({
            context: {
              name: 'PolyBoltCryptoFeed',
              data: {
                code: 'provider_required',
                status: 4011,
                channel: 'price.crypto',
                rid: 's2',
              },
            },
          }),
        ],
      ]);
    });

    it('reports a pin the ack falls back on to Sentry once, with its symbol', () => {
      const { socket } = connectWith([binanceBtc]);

      socket.receive({
        op: 'subscribed',
        channel: 'price.crypto',
        rid: 's2',
        provider: 'chainlink',
      });
      socket.receive(livePoint('chainlink', '100'));
      socket.receive(livePoint('chainlink', '101'));

      expect(sentryCalls()).toEqual([
        [
          new Error('PolyBoltCryptoFeed: provider pin fell back'),
          {
            tags: { feature: 'Predict', provider: 'polymarket' },
            context: {
              name: 'PolyBoltCryptoFeed',
              data: {
                channel: 'price.crypto',
                symbol: 'btcusd',
                requested: 'binance',
                served: 'chainlink',
              },
            },
          },
        ],
      ]);
    });

    it('reports a pin rejected with bad_filter to Sentry', () => {
      const { socket } = connectWith([binanceBtc]);

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's2',
      });

      expect(sentryCalls()).toEqual([
        [
          new Error('PolyBoltCryptoFeed: provider pin fell back'),
          expect.objectContaining({
            context: expect.objectContaining({
              data: expect.objectContaining({
                symbol: 'btcusd',
                requested: 'binance',
                served: 'none, filter rejected',
              }),
            }),
          }),
        ],
      ]);
    });

    it('warns Sentry once per subscription when another vendor serves a Chainlink request', () => {
      jest.mocked(captureMessage).mockClear();
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { feed, socket } = connectWith([chainlinkBtc]);

      socket.receive(livePoint('binance', '100'));
      socket.receive(livePoint('binance', '101'));
      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      mockSockets[1].open();
      mockSockets[1].receive({ op: 'authed', rid: 'a2' });
      mockSockets[1].receive(livePoint('binance', '102'));

      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: served provider differs from request',
        expect.objectContaining({ requested: 'chainlink', served: 'binance' }),
      );
      expect(sentryCalls()).toEqual([]);
      expect(jest.mocked(captureMessage).mock.calls).toEqual([
        [
          'PolyBoltCryptoFeed: Chainlink request served by another vendor',
          {
            level: 'warning',
            tags: { feature: 'Predict', provider: 'polymarket' },
            contexts: {
              PolyBoltCryptoFeed: {
                channel: 'price.crypto',
                symbol: 'btcusd',
                requested: 'chainlink',
                served: 'binance',
              },
            },
          },
        ],
      ]);

      feed.setSubscriptions([]);
      feed.setSubscriptions([chainlinkBtc]);
      mockSockets[2].open();
      mockSockets[2].receive({ op: 'authed', rid: 'a3' });
      mockSockets[2].receive(livePoint('binance', '103'));
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(2);
    });

    it('warns Sentry once and retries a TWAP subscription without provider on bad_filter', () => {
      jest.mocked(captureMessage).mockClear();
      const { socket } = connectWith([twap('btc')], listener(), {
        ...credentials,
        chainlinkApiKey: 'secret-cl-key',
      });
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(sentryCalls()).toEqual([]);
      expect(jest.mocked(captureMessage).mock.calls).toEqual([
        [
          'PolyBoltCryptoFeed: filter rejected',
          {
            level: 'warning',
            tags: { feature: 'Predict', provider: 'polymarket' },
            contexts: {
              PolyBoltCryptoFeed: {
                code: 'bad_filter',
                message: 'unknown field provider',
                channel: 'price.crypto.twap',
                rid: 's2',
                symbol: 'btcusd',
              },
            },
          },
        ],
      ]);
      expect(
        JSON.stringify(jest.mocked(captureMessage).mock.calls),
      ).not.toContain('secret-cl-key');
      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
    });

    it('retries a TWAP subscription once per connection and deduplicates Sentry warnings', () => {
      jest.mocked(captureMessage).mockClear();
      const { socket } = connectWith([twap('btc')]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's3',
      });
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(subscribeFrames(socket)).toHaveLength(1);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(1);

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      const reconnected = mockSockets[1];
      reconnected.open();
      reconnected.receive({
        op: 'authed',
        rid: sentFrames(reconnected)[0].rid,
      });
      const reconnectSubscribeRid = subscribeFrames(reconnected)[0].rid;
      reconnected.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: reconnectSubscribeRid,
      });

      expect(subscribeFrames(reconnected)).toEqual([
        {
          op: 'subscribe',
          rid: reconnectSubscribeRid,
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: {
                symbol: 'btcusd',
                window_seconds: 60,
                provider: 'chainlink',
              },
            },
          ],
        },
        {
          op: 'subscribe',
          rid: 's6',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(1);
    });

    it('resends Chainlink spot with provider and TWAP without provider when a shared frame hits bad_filter', () => {
      jest.mocked(captureMessage).mockClear();
      const { socket } = connectWith([spot('eth'), twap('btc')]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'ethusd', provider: 'chainlink' },
            },
          ],
        },
        {
          op: 'subscribe',
          rid: 's4',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: filter rejected',
        expect.objectContaining({
          contexts: {
            PolyBoltCryptoFeed: expect.objectContaining({
              channel: 'price.crypto.twap',
              symbol: 'btcusd',
            }),
          },
        }),
      );
    });

    it('does not resend a rejected shared frame entry that another frame already carries', () => {
      const eth = spot('eth');
      const btcTwap = twap('btc');
      const { feed, socket } = connectWith([eth, btcTwap]);
      feed.setSubscriptions([btcTwap]);
      feed.setSubscriptions([btcTwap, eth]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's5',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
    });

    it('omits provider when unsubscribing a TWAP subscription subscribed without provider', () => {
      const { feed, socket } = connectWith([spot('eth'), twap('btc')]);
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });
      socket.send.mockClear();

      feed.setSubscriptions([spot('eth')]);

      expect(sentFrames(socket)).toEqual([
        {
          op: 'unsubscribe',
          rid: 'u5',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
    });

    it('allows a removed TWAP subscription to retry without provider when resubscribed on the same connection', () => {
      const { feed, socket } = connectWith([spot('eth'), twap('btc')]);
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });
      feed.setSubscriptions([spot('eth')]);
      feed.setSubscriptions([spot('eth'), twap('btc')]);
      const resubscribeRid = subscribeFrames(socket).slice(-1)[0].rid;
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: resubscribeRid,
      });

      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's7',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
    });

    it('keeps provider on spot when unsubscribing alongside a no-provider TWAP', () => {
      const { feed, socket } = connectWith([
        spot('sol'),
        spot('eth'),
        twap('btc'),
      ]);
      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });
      socket.send.mockClear();

      feed.setSubscriptions([spot('sol')]);

      expect(sentFrames(socket)).toEqual([
        {
          op: 'unsubscribe',
          rid: 'u5',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'ethusd', provider: 'chainlink' },
            },
          ],
        },
        {
          op: 'unsubscribe',
          rid: 'u6',
          subscriptions: [
            {
              channel: 'price.crypto.twap',
              filter: { symbol: 'btcusd', window_seconds: 60 },
            },
          ],
        },
      ]);
    });

    it('does not resend a rejected shared frame when chainlinkUnavailable is set', () => {
      const { feed, socket } = connectWith([spot('eth'), twap('btc')]);
      feed.setSubscriptions([spot('eth'), twap('btc'), spot('sol')]);
      socket.receive(keyRequired('s3'));
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'unknown field provider',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('keeps bad_filter behaviour unchanged for a pinned spot frame', () => {
      jest.mocked(captureMessage).mockClear();
      const { socket } = connectWith([binanceBtc]);
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        channel: 'price.crypto',
        rid: 's2',
      });

      expect(jest.mocked(captureMessage)).not.toHaveBeenCalled();
      expect(sentryCalls()).toHaveLength(1);
      expect(sentFrames(socket)).toEqual([
        {
          op: 'subscribe',
          rid: 's3',
          subscriptions: [
            {
              channel: 'price.crypto',
              filter: { symbol: 'btcusd', provider: 'chainlink' },
            },
          ],
        },
      ]);
    });

    it('clears tracked frames on reconnect', () => {
      jest.mocked(captureMessage).mockClear();
      const { socket } = connectWith([twap('btc')]);

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      const reconnected = mockSockets[1];
      reconnected.open();
      reconnected.receive({
        op: 'authed',
        rid: sentFrames(reconnected)[0].rid,
      });
      reconnected.send.mockClear();

      reconnected.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'bad filter',
        channel: 'price.crypto.twap',
        rid: 's2',
      });

      expect(reconnected.send).not.toHaveBeenCalled();
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: filter rejected',
        expect.objectContaining({
          contexts: {
            PolyBoltCryptoFeed: {
              code: 'bad_filter',
              message: 'bad filter',
              channel: 'price.crypto.twap',
              rid: 's2',
            },
          },
        }),
      );
    });

    it('warns Sentry without retrying when bad_filter hits an unsubscribe frame', () => {
      jest.mocked(captureMessage).mockClear();
      const { feed, socket } = connectWith([spot('eth'), twap('btc')]);
      socket.send.mockClear();

      feed.setSubscriptions([spot('eth')]);
      const unsubscribeRid = sentFrames(socket)[0].rid;
      socket.send.mockClear();

      socket.receive({
        op: 'error',
        code: 'bad_filter',
        message: 'bad filter',
        channel: 'price.crypto.twap',
        rid: unsubscribeRid,
      });

      expect(socket.send).not.toHaveBeenCalled();
      expect(jest.mocked(captureMessage)).toHaveBeenCalledTimes(1);
      expect(jest.mocked(captureMessage)).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: filter rejected',
        expect.objectContaining({
          contexts: {
            PolyBoltCryptoFeed: expect.objectContaining({
              rid: unsubscribeRid,
              symbol: 'btcusd',
            }),
          },
        }),
      );
    });
  });

  describe('Chainlink API key', () => {
    const fakeKey = 'fake-chainlink-key-for-tests';
    const keyed: PolyBoltCredentials = {
      ...credentials,
      chainlinkApiKey: fakeKey,
    };
    const authFrames = (socket: MockSocket) =>
      socket.send.mock.calls
        .map(
          ([frame]) => JSON.parse(frame as string) as Record<string, unknown>,
        )
        .filter((frame) => frame.op === 'auth');

    const openFeed = (feedCredentials: PolyBoltCredentials) => {
      const feed = new PolyBoltCryptoFeed(listener());
      feed.setCredentials(feedCredentials);
      feed.setSubscriptions([chainlinkBtc]);
      mockSockets[0].open();
      return { feed, socket: mockSockets[0] };
    };

    it('sends the key at the top level of the first auth frame, not inside auth', () => {
      const { socket } = openFeed(keyed);

      expect(authFrames(socket)).toEqual([
        {
          op: 'auth',
          rid: 'a1',
          auth: { apiKey: 'key', secret: 'secret', passphrase: 'pass' },
          chainlink_api_key: fakeKey,
        },
      ]);
    });

    it.each([
      ['no key', credentials],
      ['an empty key', { ...credentials, chainlinkApiKey: '' }],
    ])('sends no key field with %s', (_label, feedCredentials) => {
      const { socket } = openFeed(feedCredentials);

      expect(Object.keys(authFrames(socket)[0])).toEqual(['op', 'rid', 'auth']);
    });

    it('sends the key again on a reconnect', () => {
      const { socket } = openFeed(keyed);
      socket.receive({ op: 'authed', rid: 'a1' });

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      mockSockets[1].open();

      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: fakeKey }),
      ]);
    });

    it('opens a new connection with a new auth frame when a key arrives', () => {
      const { feed, socket } = connectWith([chainlinkBtc]);

      feed.setCredentials(keyed);

      expect(socket.close).toHaveBeenCalled();
      expect(authFrames(socket)).toHaveLength(1);
      expect(mockSockets).toHaveLength(2);
      mockSockets[1].open();
      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: fakeKey }),
      ]);
    });

    it('opens a new connection when the key changes', () => {
      const { feed, socket } = connectWith([chainlinkBtc], listener(), keyed);

      feed.setCredentials({ ...keyed, chainlinkApiKey: 'fake-rotated-key' });

      expect(socket.close).toHaveBeenCalled();
      mockSockets[1].open();
      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: 'fake-rotated-key' }),
      ]);
    });

    it.each([
      ['the same key again', keyed, { ...keyed }],
      [
        'an empty key in place of none',
        credentials,
        { ...credentials, chainlinkApiKey: '' },
      ],
    ])('keeps the connection for %s', (_label, first, second) => {
      const { feed } = connectWith([chainlinkBtc], listener(), first);

      feed.setCredentials(second);

      expect(mockSockets).toHaveLength(1);
    });

    it('holds a key that arrives while disconnected until the next reconnect', () => {
      const { feed } = connectWith([chainlinkBtc]);
      feed.disconnect();

      feed.setCredentials(keyed);
      expect(mockSockets).toHaveLength(1);

      feed.reconnect();
      mockSockets[1].open();
      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: fakeKey }),
      ]);
    });

    it('authenticates again on a new connection instead of a second auth frame', () => {
      const { socket } = connectWith([chainlinkBtc], listener(), keyed);

      socket.receive({ op: 'error', code: 'auth_required' });
      jest.advanceTimersByTime(999);
      expect(authFrames(socket)).toHaveLength(1);
      expect(mockSockets).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(2);
      mockSockets[1].open();
      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: fakeKey }),
      ]);
    });

    it('reconnects after a single backoff on auth_unavailable when a Chainlink key is set', () => {
      const { socket } = connectWith([chainlinkBtc], listener(), keyed);

      socket.receive({ op: 'error', code: 'auth_unavailable' });
      socket.receive({ op: 'error', code: 'auth_unavailable' });
      jest.advanceTimersByTime(999);
      expect(authFrames(socket)).toHaveLength(1);
      expect(mockSockets).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(2);
      mockSockets[1].open();
      expect(authFrames(mockSockets[1])).toEqual([
        expect.objectContaining({ chainlink_api_key: fakeKey }),
      ]);

      mockSockets[1].receive({ op: 'error', code: 'auth_unavailable' });
      jest.advanceTimersByTime(1_999);
      expect(mockSockets).toHaveLength(2);
      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(3);
    });

    it('grows the reconnect backoff while auth keeps failing and resets it once authed', () => {
      const { socket } = connectWith([chainlinkBtc], listener(), keyed);
      const expectReconnectAfter = (delayMs: number): MockSocket => {
        const opened = mockSockets.length;
        jest.advanceTimersByTime(delayMs - 1);
        expect(mockSockets).toHaveLength(opened);
        jest.advanceTimersByTime(1);
        expect(mockSockets).toHaveLength(opened + 1);
        const next = mockSockets[opened];
        next.open();
        return next;
      };

      socket.receive({ op: 'error', code: 'auth_required' });
      let current = expectReconnectAfter(1_000);
      current.receive({ op: 'error', code: 'auth_required' });
      current = expectReconnectAfter(2_000);
      current.receive({ op: 'error', code: 'auth_unavailable' });
      current = expectReconnectAfter(4_000);
      current.receive({ op: 'error', code: 'auth_required' });
      current = expectReconnectAfter(8_000);
      current.receive({ op: 'error', code: 'auth_unavailable' });
      current = expectReconnectAfter(16_000);
      current.receive({ op: 'error', code: 'auth_unavailable' });
      current = expectReconnectAfter(30_000);

      current.receive({ op: 'authed', rid: 'a1' });
      current.receive({ op: 'error', code: 'auth_required' });
      expectReconnectAfter(1_000);
    });

    it('never logs the key', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { feed, socket } = connectWith(
        [chainlinkBtc, binanceBtc],
        listener(),
        keyed,
      );

      socket.receive({
        op: 'error',
        code: 'chainlink_key_required',
        status: 4010,
        rid: 's2',
      });
      socket.receive({ op: 'error', code: 'provider_required', rid: 's2' });
      socket.receive({ op: 'error', code: 'bad_filter', rid: 's3' });
      socket.receive(livePoint('pyth', '100'));
      socket.onmessage?.({ data: 'not json' });
      socket.onerror?.();
      feed.setCredentials({ ...keyed, chainlinkApiKey: 'fake-rotated-key' });

      const logged = JSON.stringify([
        logSpy.mock.calls,
        jest
          .mocked(Logger.error)
          .mock.calls.map(([error, options]) => [error.message, options]),
        jest.mocked(captureMessage).mock.calls,
      ]);
      expect(jest.mocked(Logger.error)).toHaveBeenCalled();
      expect(jest.mocked(captureMessage)).toHaveBeenCalled();
      expect(logged).not.toContain(fakeKey);
      expect(logged).not.toContain('fake-rotated-key');
      expect(logged).toContain('"hasChainlinkApiKey":true');
    });
  });

  describe('connection lifecycle', () => {
    const btc: PolyBoltSubscription = {
      channel: 'price.crypto',
      callerSymbol: 'btc/usd',
      wireSymbol: 'btcusd',
    };
    const eth: PolyBoltSubscription = {
      channel: 'price.crypto',
      callerSymbol: 'eth/usd',
      wireSymbol: 'ethusd',
    };

    const sentOps = (socket: MockSocket) =>
      socket.send.mock.calls.map(
        ([frame]) => (JSON.parse(frame as string) as { op: string }).op,
      );

    const mockMaxRandom = () =>
      jest
        .spyOn(global.crypto, 'getRandomValues')
        .mockImplementation(<T extends ArrayBufferView | null>(array: T): T => {
          (array as unknown as Uint32Array).fill(0xffffffff);
          return array;
        });

    it('waits for credentials before it opens a socket', () => {
      const feed = new PolyBoltCryptoFeed(listener());

      feed.setSubscriptions([btc]);
      expect(mockSockets).toHaveLength(0);

      feed.setCredentials(credentials);
      expect(mockSockets).toHaveLength(1);
    });

    it('ignores credentials identical to the current ones', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      connectAuthedFeed(feed);

      feed.setCredentials({ ...credentials });

      expect(mockSockets).toHaveLength(1);
    });

    it('reports connected only while authed on an open socket', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      expect(feed.isConnected()).toBe(false);

      const { socket } = connectAuthedFeed(feed);
      expect(feed.isConnected()).toBe(true);

      socket.closeWith(1006);
      expect(feed.isConnected()).toBe(false);
    });

    it('subscribes to at most 64 symbols and logs the overflow', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const feed = new PolyBoltCryptoFeed(listener());
      const many = Array.from({ length: 65 }, (_, index) => ({
        channel: 'price.crypto' as const,
        callerSymbol: `c${index}/usd`,
        wireSymbol: `c${index}usd`,
      }));

      feed.setCredentials(credentials);
      feed.setSubscriptions(many);
      const socket = mockSockets[0];
      socket.open();
      socket.receive({ op: 'authed', rid: 'a1' });

      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: subscription limit exceeded',
        { requested: 65, limit: 64 },
      );
      const subscribe = JSON.parse(socket.send.mock.calls[1][0] as string) as {
        subscriptions: unknown[];
      };
      expect(subscribe.subscriptions).toHaveLength(64);
    });

    it('closes the socket and stays closed when the last subscription goes away', () => {
      const handlers = listener();
      const feed = new PolyBoltCryptoFeed(handlers);
      const { socket } = connectAuthedFeed(feed, handlers);
      handlers.onConnectionChange.mockClear();

      feed.setSubscriptions([]);
      jest.advanceTimersByTime(60_000);

      expect(socket.close).toHaveBeenCalled();
      expect(handlers.onConnectionChange).toHaveBeenCalled();
      expect(feed.isConnected()).toBe(false);
      expect(mockSockets).toHaveLength(1);
    });

    it('cancels a pending reconnect when the last subscription goes away', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.closeWith(1006);
      feed.setSubscriptions([]);
      jest.advanceTimersByTime(60_000);

      expect(mockSockets).toHaveLength(1);
    });

    it('opens a fresh socket on reconnect', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      feed.reconnect();

      expect(socket.close).toHaveBeenCalled();
      expect(mockSockets).toHaveLength(2);
    });

    it('does not reconnect without subscriptions', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      feed.setCredentials(credentials);

      feed.reconnect();

      expect(mockSockets).toHaveLength(0);
    });

    it('treats a close without a code as abnormal and reconnects', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.readyState = MockSocket.CLOSED;
      socket.onclose?.({});
      jest.advanceTimersByTime(1_000);

      expect(mockSockets).toHaveLength(2);
    });

    it('doubles the backoff while reconnects keep failing', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_000);
      mockSockets[1].closeWith(1006);
      jest.advanceTimersByTime(1_999);
      expect(mockSockets).toHaveLength(2);

      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(3);
    });

    it('adds up to a second of jitter to the backoff', () => {
      mockMaxRandom();
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.closeWith(1006);
      jest.advanceTimersByTime(1_998);
      expect(mockSockets).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(2);
    });

    it('reconnects within ten seconds after a draining close 4003', () => {
      mockMaxRandom();
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.closeWith(4003);
      jest.advanceTimersByTime(9_999);
      expect(mockSockets).toHaveLength(1);

      jest.advanceTimersByTime(1);
      expect(mockSockets).toHaveLength(2);
    });

    it('retries with backoff when the socket cannot be opened', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      let failNext = true;
      class FlakySocket extends MockSocket {
        constructor(url: string) {
          if (failNext) {
            failNext = false;
            throw new Error('offline');
          }
          super(url);
        }
      }
      (global as unknown as { WebSocket: typeof MockSocket }).WebSocket =
        FlakySocket;
      const feed = new PolyBoltCryptoFeed(listener());

      feed.setCredentials(credentials);
      feed.setSubscriptions([btc]);
      expect(mockSockets).toHaveLength(0);
      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: failed to open socket',
        expect.objectContaining({ error: expect.any(Error) }),
      );

      jest.advanceTimersByTime(1_000);
      expect(mockSockets).toHaveLength(1);
    });

    it('logs socket errors', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.onerror?.();

      expect(logSpy).toHaveBeenCalledWith('PolyBoltCryptoFeed: socket error');
    });

    it('lets new credentials lift an auth block from close 4001', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);
      socket.closeWith(4001);

      feed.reconnect();
      expect(mockSockets).toHaveLength(1);

      feed.setCredentials({ ...credentials, apiKey: 'rotated' });
      expect(mockSockets).toHaveLength(2);
    });

    it('stays closed after policy close 4008 until the subscriptions change', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      socket.closeWith(4008);
      jest.advanceTimersByTime(60_000);
      feed.reconnect();
      feed.setSubscriptions([{ ...btc }]);
      expect(mockSockets).toHaveLength(1);

      feed.setSubscriptions([btc, eth]);
      expect(mockSockets).toHaveLength(2);
    });

    it('sends auth again on auth_required, at most eight times per connection', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);

      for (let attempt = 0; attempt < 10; attempt += 1) {
        socket.receive({ op: 'error', code: 'auth_required' });
      }

      expect(sentOps(socket).filter((op) => op === 'auth')).toHaveLength(8);
      expect(feed.isConnected()).toBe(false);
    });

    it('retries auth once after a backoff on auth_unavailable', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);
      socket.send.mockClear();

      socket.receive({ op: 'error', code: 'auth_unavailable' });
      socket.receive({ op: 'error', code: 'auth_unavailable' });
      jest.advanceTimersByTime(999);
      expect(socket.send).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(sentOps(socket)).toEqual(['auth']);
    });

    it('drops a pending auth retry on disconnect', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);
      socket.receive({ op: 'error', code: 'auth_unavailable' });
      socket.send.mockClear();

      feed.disconnect();
      jest.advanceTimersByTime(60_000);

      expect(socket.send).not.toHaveBeenCalled();
    });

    it('ignores unknown ops, errors without a code and unknown error codes', () => {
      const feed = new PolyBoltCryptoFeed(listener());
      const { socket } = connectAuthedFeed(feed);
      socket.send.mockClear();

      socket.receive({ op: 'heartbeat' });
      socket.receive({ op: 'error' });
      socket.receive({ op: 'error', code: 'rate_limited' });
      socket.receive({ op: 'subscribed', rid: 42 });
      socket.receive({ op: 'subscribed', rid: 's99' });
      jest.advanceTimersByTime(60_000);

      expect(socket.send).not.toHaveBeenCalled();
      expect(feed.isConnected()).toBe(true);
    });
  });

  describe('message parsing', () => {
    const connect = (channel: PolyBoltSubscription['channel']) => {
      const handlers = listener();
      const feed = new PolyBoltCryptoFeed(handlers);
      feed.setCredentials(credentials);
      feed.setSubscriptions([
        { channel, callerSymbol: 'btc/usd', wireSymbol: 'btcusd' },
      ]);
      const socket = mockSockets[0];
      socket.open();
      socket.receive({ op: 'authed', rid: 'a1' });
      return { socket, handlers };
    };

    const expectNothingEmitted = (handlers: ReturnType<typeof listener>) => {
      expect(handlers.onSnapshot).not.toHaveBeenCalled();
      expect(handlers.onLive).not.toHaveBeenCalled();
    };

    it('ignores empty frames, pong and non-object JSON', () => {
      const { socket, handlers } = connect('price.crypto');

      socket.onmessage?.({ data: '' });
      socket.onmessage?.({ data: 'pong' });
      socket.onmessage?.({ data: 42 as unknown as string });
      socket.receive([1, 2]);

      expectNothingEmitted(handlers);
    });

    it('logs and drops a frame that is not JSON', () => {
      const logSpy = jest.spyOn(DevLogger, 'log');
      const { socket, handlers } = connect('price.crypto');

      socket.onmessage?.({ data: '{not json' });

      expect(logSpy).toHaveBeenCalledWith(
        'PolyBoltCryptoFeed: failed to parse message',
        expect.objectContaining({ error: expect.any(SyntaxError) }),
      );
      expectNothingEmitted(handlers);
    });

    it('ignores envelopes for other channels or without a usable payload', () => {
      const { socket, handlers } = connect('price.crypto');

      socket.receive({
        channel: 'price.equity',
        payload: { symbol: 'btcusd' },
      });
      socket.receive({ channel: 'price.crypto', payload: 'btcusd' });
      socket.receive({ channel: 'price.crypto', payload: { symbol: 1 } });
      socket.receive({
        channel: 'price.crypto',
        payload: {
          symbol: 'ethusd',
          timestamp: 1,
          full_accuracy_value: '1',
        },
      });

      expectNothingEmitted(handlers);
    });

    it('drops snapshot points without a timestamp or a finite price', () => {
      const { socket, handlers } = connect('price.crypto');

      socket.receive({
        channel: 'price.crypto',
        snapshot: true,
        payload: { symbol: 'btcusd', data: 'none' },
      });
      socket.receive({
        channel: 'price.crypto',
        snapshot: true,
        payload: {
          symbol: 'btcusd',
          data: [
            null,
            { timestamp: '1', full_accuracy_value: '1' },
            { timestamp: 2, full_accuracy_value: 3 },
            { timestamp: 3, full_accuracy_value: ' ' },
            { timestamp: 4, full_accuracy_value: 'abc' },
          ],
        },
      });
      expect(handlers.onSnapshot).not.toHaveBeenCalled();

      socket.receive({
        channel: 'price.crypto',
        snapshot: true,
        payload: {
          symbol: 'btcusd',
          data: [
            { timestamp: 4, full_accuracy_value: 'Infinity' },
            { timestamp: 5, full_accuracy_value: '99.5' },
          ],
        },
      });
      expect(handlers.onSnapshot).toHaveBeenCalledWith('price.crypto', [
        { symbol: 'btc/usd', price: 99.5, timestamp: 5 },
      ]);
    });

    it('emits a live point for an unpinned subscription without a provider', () => {
      const { socket, handlers } = connect('price.crypto');

      socket.receive({
        channel: 'price.crypto',
        payload: {
          symbol: 'btcusd',
          timestamp: 1_000,
          full_accuracy_value: '101.25',
        },
      });

      expect(handlers.onLive).toHaveBeenCalledWith('price.crypto', {
        symbol: 'btc/usd',
        price: 101.25,
        timestamp: 1_000,
      });
    });

    it('drops live points without a timestamp or a price', () => {
      const { socket, handlers } = connect('price.crypto');

      socket.receive({
        channel: 'price.crypto',
        payload: { symbol: 'btcusd', full_accuracy_value: '1' },
      });
      socket.receive({
        channel: 'price.crypto',
        payload: { symbol: 'btcusd', timestamp: 1, full_accuracy_value: '' },
      });

      expect(handlers.onLive).not.toHaveBeenCalled();
    });

    it('emits only 60 second TWAP points and tags them with the window', () => {
      const { socket, handlers } = connect('price.crypto.twap');

      socket.receive({
        channel: 'price.crypto.twap',
        payload: {
          symbol: 'btcusd',
          timestamp: 1_000,
          window_seconds: 300,
          full_accuracy_value: '1',
        },
      });
      expect(handlers.onLive).not.toHaveBeenCalled();

      socket.receive({
        channel: 'price.crypto.twap',
        payload: {
          symbol: 'btcusd',
          timestamp: 2_000,
          window_seconds: 60,
          full_accuracy_value: '2',
        },
      });
      expect(handlers.onLive).toHaveBeenCalledWith('price.crypto.twap', {
        symbol: 'btc/usd',
        price: 2,
        timestamp: 2_000,
        twapWindowSeconds: 60,
      });
    });
  });
});
