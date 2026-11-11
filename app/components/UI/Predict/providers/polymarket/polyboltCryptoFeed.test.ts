import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import {
  POLYBOLT_WS_URL,
  PolyBoltCryptoFeed,
  toPolyboltChannel,
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

describe('toPolyboltChannel', () => {
  it.each(['xauusd', 'xagusd'])(
    'serves %s spot prices on price.equity',
    (symbol) => {
      expect(toPolyboltChannel('price.crypto', symbol)).toBe('price.equity');
    },
  );

  it.each(['btcusd', 'ethusd', 'solusd', 'hypeusd'])(
    'keeps %s on price.crypto',
    (symbol) => {
      expect(toPolyboltChannel('price.crypto', symbol)).toBe('price.crypto');
    },
  );

  it('keeps the TWAP channel as requested', () => {
    expect(toPolyboltChannel('price.crypto.twap', 'btcusd')).toBe(
      'price.crypto.twap',
    );
    expect(toPolyboltChannel('price.crypto.twap', 'xauusd')).toBe(
      'price.crypto.twap',
    );
  });
});

describe('toPolyboltFilter', () => {
  it('sends only the symbol on price.equity, where metals default to Chainlink', () => {
    expect(toPolyboltFilter('price.equity', 'xauusd')).toEqual({
      symbol: 'xauusd',
    });
    expect(toPolyboltFilter('price.equity', 'xauusd', 'binance')).toEqual({
      symbol: 'xauusd',
    });
  });

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

  describe('price.equity', () => {
    const connectGold = (): {
      socket: MockSocket;
      handlers: ReturnType<typeof listener>;
    } => {
      const handlers = listener();
      const feed = new PolyBoltCryptoFeed(handlers);
      feed.setCredentials(credentials);
      feed.setSubscriptions([
        {
          channel: 'price.equity',
          callerSymbol: 'xau/usd',
          wireSymbol: 'xauusd',
        },
      ]);
      const socket = mockSockets[0];
      socket.open();
      socket.receive({ op: 'authed', rid: 'a1' });
      return { socket, handlers };
    };

    it('subscribes gold on price.equity without a provider pin', () => {
      const { socket } = connectGold();

      expect(JSON.parse(socket.send.mock.calls[1][0] as string)).toEqual({
        op: 'subscribe',
        rid: 's2',
        subscriptions: [
          { channel: 'price.equity', filter: { symbol: 'xauusd' } },
        ],
      });
    });

    it('emits a live gold point from full_accuracy_value', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        v: 1,
        channel: 'price.equity',
        seq: 5,
        ts: 1_788_973_001_200,
        payload: {
          symbol: 'xauusd',
          value: 4029.9,
          full_accuracy_value: '4029.91',
          timestamp: 1_788_973_001_200,
          received_at: 1_788_973_001_207,
          is_carried_forward: false,
          market_status: 'open',
          source: 'chainlink',
        },
      });

      expect(handlers.onLive).toHaveBeenCalledWith('price.equity', {
        symbol: 'xau/usd',
        price: 4029.91,
        timestamp: 1_788_973_001_200,
      });
    });

    it('falls back to value when full_accuracy_value is missing', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.equity',
        payload: {
          symbol: 'xauusd',
          value: 4030.36,
          timestamp: 2_000,
          source: 'chainlink',
        },
      });

      expect(handlers.onLive).toHaveBeenCalledWith('price.equity', {
        symbol: 'xau/usd',
        price: 4030.36,
        timestamp: 2_000,
      });
    });

    it('keeps a carried-forward price while the market reads open', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.equity',
        payload: {
          symbol: 'xauusd',
          value: 4030.1,
          full_accuracy_value: '4030.1',
          timestamp: 3_000,
          is_carried_forward: true,
          market_status: 'open',
          source: 'chainlink',
        },
      });

      expect(handlers.onLive).toHaveBeenCalledTimes(1);
    });

    it('paints no price while the market is closed', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.equity',
        payload: {
          symbol: 'xauusd',
          value: 4012.35,
          full_accuracy_value: '4012.35',
          timestamp: 1_788_973_001_200,
          is_carried_forward: true,
          market_status: 'closed',
          source: 'chainlink',
        },
      });
      socket.receive({
        channel: 'price.equity',
        snapshot: true,
        payload: {
          symbol: 'xauusd',
          source: 'chainlink',
          market_status: 'closed',
          data: [{ timestamp: 1, full_accuracy_value: '4012.35' }],
        },
      });

      expect(handlers.onLive).not.toHaveBeenCalled();
      expect(handlers.onSnapshot).not.toHaveBeenCalled();
    });

    it('emits an open snapshot oldest first and drops malformed points', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.equity',
        snapshot: true,
        payload: {
          symbol: 'xauusd',
          source: 'chainlink',
          market_status: 'open',
          data: [
            { timestamp: 30, full_accuracy_value: '4030.36' },
            { timestamp: 10, value: 4029.91 },
            null,
            { timestamp: '20', full_accuracy_value: '4030' },
            { timestamp: 40, full_accuracy_value: 'abc' },
            { timestamp: 50, value: 0 },
            { timestamp: Number.NaN, full_accuracy_value: '4030' },
          ],
        },
      });

      expect(handlers.onSnapshot).toHaveBeenCalledWith('price.equity', [
        { symbol: 'xau/usd', price: 4029.91, timestamp: 10 },
        { symbol: 'xau/usd', price: 4030.36, timestamp: 30 },
      ]);
    });

    it('drops live gold points without a usable timestamp or price', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.equity',
        payload: { symbol: 'xauusd', full_accuracy_value: '4030' },
      });
      socket.receive({
        channel: 'price.equity',
        payload: { symbol: 'xauusd', timestamp: 1, value: -1 },
      });
      socket.receive({
        channel: 'price.equity',
        payload: { symbol: 'xauusd', timestamp: 1, full_accuracy_value: '' },
      });

      expect(handlers.onLive).not.toHaveBeenCalled();
    });

    it('does not hand gold frames on price.crypto to the equity subscription', () => {
      const { socket, handlers } = connectGold();

      socket.receive({
        channel: 'price.crypto',
        payload: {
          symbol: 'xauusd',
          timestamp: 1,
          full_accuracy_value: '4030',
        },
      });

      expect(handlers.onLive).not.toHaveBeenCalled();
    });
  });
});
