import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
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
  it('sends no provider for a Chainlink market', () => {
    expect(toPolyboltFilter('price.crypto', 'btcusd')).toEqual({
      symbol: 'btcusd',
    });
  });

  it('pins Binance for a Binance market', () => {
    expect(toPolyboltFilter('price.crypto', 'btcusd', 'binance')).toEqual({
      symbol: 'btcusd',
      provider: 'binance',
    });
  });

  it('never pins the TWAP channel, which only Chainlink serves', () => {
    expect(toPolyboltFilter('price.crypto.twap', 'btcusd', 'binance')).toEqual({
      symbol: 'btcusd',
      window_seconds: 60,
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
          filter: { symbol: 'btcusd', window_seconds: 60 },
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
    ) => {
      const feed = new PolyBoltCryptoFeed(handlers);
      feed.setCredentials(credentials);
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
            { channel: 'price.crypto', filter: { symbol: 'btcusd' } },
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

    it('resubscribes unpinned after a bad_filter so prices keep flowing', () => {
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
            { channel: 'price.crypto', filter: { symbol: 'btcusd' } },
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
        [{ channel: 'price.crypto', filter: { symbol: 'btcusd' } }],
        [
          {
            channel: 'price.crypto',
            filter: { symbol: 'btcusd', provider: 'binance' },
          },
        ],
      ]);
    });
  });
});
