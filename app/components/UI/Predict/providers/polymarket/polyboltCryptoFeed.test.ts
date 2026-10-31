import {
  POLYBOLT_WS_URL,
  PolyBoltCryptoFeed,
  toPolyboltWireSymbol,
  type PolyBoltCredentials,
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

describe('PolyBoltCryptoFeed', () => {
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    mockSockets = [];
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0);
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
});
