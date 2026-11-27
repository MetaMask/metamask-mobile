import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import cryptoUpDownDeterminedEvent from './fixtures/crypto-up-down-determined-event.json';
import cryptoUpDownLiveFeed from './fixtures/crypto-up-down-live-feed.json';
import cryptoUpDownEmptyFeed from './fixtures/crypto-up-down-live-feed-empty.json';
import cryptoUpDownPriceTbdFeed from './fixtures/crypto-up-down-live-feed-price-tbd.json';
import cryptoUpDownSettledEvent from './fixtures/crypto-up-down-settled-event.json';
import { parsePredictEvent, parsePredictFeed } from './marketData';

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const [liveEvent] = cryptoUpDownLiveFeed.events;

const withWindow = (value: unknown) => ({ ...liveEvent, window: value });

describe('Event window contract', () => {
  beforeEach(() => {
    jest.mocked(DevLogger.log).mockClear();
  });

  it('parses the Up/Down window of the live Feed fixture', () => {
    const feed = parsePredictFeed(cryptoUpDownLiveFeed);

    expect(feed.events[0].window).toEqual({
      kind: 'crypto_up_down',
      coin: 'BTC',
      priceToBeat: '60461.27',
      priceDecimals: 2,
      indexName: 'CF Benchmarks BRTI',
      averagingSeconds: 60,
      next: {
        eventId: 'KXBTC15M-26NOV261830',
        opensAt: '2026-11-26T23:15:00.000Z',
      },
    });
    expect(DevLogger.log).not.toHaveBeenCalled();
  });

  it('parses the settled window and its settled price', () => {
    const event = parsePredictEvent(cryptoUpDownSettledEvent);

    expect(event.window).toMatchObject({
      kind: 'crypto_up_down',
      priceToBeat: '60542.28',
      settledPrice: '60461.27',
    });
    expect(event.markets[0].status).toBe('finalized');
  });

  it('parses a determined Event that has no settled price yet', () => {
    const event = parsePredictEvent(cryptoUpDownDeterminedEvent);

    expect(event.window).toMatchObject({
      kind: 'crypto_up_down',
      priceToBeat: '60542.28',
    });
    expect(event.window?.settledPrice).toBeUndefined();
    expect(event.markets[0].status).toBe('determined');
  });

  it('also accepts a null settled price', () => {
    const event = parsePredictEvent({
      ...cryptoUpDownDeterminedEvent,
      window: { ...cryptoUpDownDeterminedEvent.window, settledPrice: null },
    });

    expect(event.window?.settledPrice).toBeNull();
  });

  it('parses prices without trailing zeros', () => {
    const event = parsePredictEvent(cryptoUpDownSettledEvent);

    expect(event.markets[0].outcomes[0].askPrice).toBe('0.01');
    expect(event.markets[0].outcomes[1].askPrice).toBe('1');
  });

  it('keeps the settled price once the market is finalized', () => {
    const event = parsePredictEvent(cryptoUpDownSettledEvent);

    expect(event.window?.settledPrice).toBe('60461.27');
  });

  it('parses the live Feed fixture with a price to beat that is not set', () => {
    const feed = parsePredictFeed(cryptoUpDownPriceTbdFeed);

    expect(feed.events[0].window?.priceToBeat).toBeNull();
  });

  it('parses an empty live Feed with no cursor', () => {
    const feed = parsePredictFeed(cryptoUpDownEmptyFeed);

    expect(feed.events).toEqual([]);
    expect(feed.nextCursor).toBeUndefined();
  });

  it('parses a live Feed with one coin and no cursor', () => {
    const feed = parsePredictFeed(cryptoUpDownLiveFeed);

    expect(feed.events).toHaveLength(1);
    expect(feed.nextCursor).toBeUndefined();
  });

  it('keeps the Kalshi subtitle as sent', () => {
    const subtitle = 'Nov 26 - 6:00PM EST to 6:15PM EST';

    const event = parsePredictEvent({ ...liveEvent, subtitle });

    expect(event.subtitle).toBe(subtitle);
  });

  it('reads a null price to beat as not set yet', () => {
    const event = parsePredictEvent(
      withWindow({ ...liveEvent.window, priceToBeat: null }),
    );

    expect(event.window?.priceToBeat).toBeNull();
  });

  it('reads a missing price to beat as not set yet', () => {
    const { priceToBeat: _removed, ...windowWithoutPrice } = liveEvent.window;

    const event = parsePredictEvent(withWindow(windowWithoutPrice));

    expect(event.window?.priceToBeat).toBeNull();
  });

  it('accepts a window without a next round', () => {
    const { next: _removed, ...windowWithoutNext } = liveEvent.window;

    const event = parsePredictEvent(withWindow(windowWithoutNext));

    expect(event.window).toBeDefined();
    expect(event.window?.next).toBeUndefined();
  });

  it('removes unknown fields from the window', () => {
    const event = parsePredictEvent(
      withWindow({ ...liveEvent.window, futureField: 'value' }),
    );

    expect(event.window).not.toHaveProperty('futureField');
  });

  it('leaves the Event standard when the window is missing', () => {
    const { window: _removed, ...standardEvent } = liveEvent;

    const event = parsePredictEvent(standardEvent);

    expect(event.window).toBeUndefined();
    expect(event.title).toBe('Bitcoin up or down');
    expect(DevLogger.log).not.toHaveBeenCalled();
  });

  it('keeps the Event standard when the window kind is unknown', () => {
    const event = parsePredictEvent(
      withWindow({ ...liveEvent.window, kind: 'future_kind' }),
    );

    expect(event.window).toBeUndefined();
    expect(event.markets).toHaveLength(1);
    expect(DevLogger.log).toHaveBeenCalledWith(
      expect.stringContaining('Dropped unknown or malformed Event window'),
      expect.any(String),
    );
  });

  it.each([
    ['a missing coin', { coin: undefined }],
    ['an empty coin', { coin: ' ' }],
    ['a price to beat that is not a decimal', { priceToBeat: '60,461.27' }],
    ['a numeric price to beat', { priceToBeat: 60461.27 }],
    ['negative price decimals', { priceDecimals: -1 }],
    ['fractional price decimals', { priceDecimals: 1.5 }],
    ['zero averaging seconds', { averagingSeconds: 0 }],
    [
      'a next round with a bad time',
      { next: { eventId: 'next', opensAt: 'soon' } },
    ],
  ])('keeps the Event standard for %s', (_name, overrides) => {
    const event = parsePredictEvent(
      withWindow({ ...liveEvent.window, ...overrides }),
    );

    expect(event.window).toBeUndefined();
    expect(event.id).toBe(liveEvent.id);
  });

  it('keeps the Event standard when the window is not an object', () => {
    expect(parsePredictEvent(withWindow('crypto_up_down')).window).toBe(
      undefined,
    );
    expect(parsePredictEvent(withWindow(null)).window).toBe(undefined);
  });

  it('does not reject a Feed because one Event has a bad window', () => {
    const feed = parsePredictFeed({
      ...cryptoUpDownLiveFeed,
      events: [liveEvent, withWindow({ kind: 'future_kind' })],
    });

    expect(feed.events).toHaveLength(2);
    expect(feed.events[0].window).toBeDefined();
    expect(feed.events[1].window).toBeUndefined();
  });
});
