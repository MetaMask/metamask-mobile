import { readPredictEventRef } from '../eventRef';
import type { PredictIntent } from '../intents';
import { parsePredictLink } from './parsePredictLink';

const parse = (predictPath: string, origin?: string) =>
  parsePredictLink({ predictPath, origin });

/** The intent with its Event reference read, for comparison. */
const readable = (intent: PredictIntent | null) =>
  intent?.type === 'event'
    ? { ...intent, eventRef: readPredictEventRef(intent.eventRef) }
    : intent;

const polymarketEvent = (marketId: string, entryPoint = 'deeplink') => ({
  type: 'event',
  eventRef: {
    implementation: 'legacy',
    venue: 'polymarket',
    marketId,
    providerId: 'polymarket',
  },
  entryPoint,
});

describe('parsePredictLink', () => {
  describe('unmarked V1 links are Polymarket-origin', () => {
    it.each([
      ['?market=23246', '23246'],
      ['?marketId=12345', '12345'],
      ['?market=23246&marketId=99999', '23246'],
      ['predict?market=abc789', 'abc789'],
      ['?feed=sports&market=123', '123'],
      // A Kalshi-shaped identifier is still a Polymarket market: the Venue is
      // never guessed from an identifier.
      ['?market=KXNFLGAME-25NOV09BUFMIA', 'KXNFLGAME-25NOV09BUFMIA'],
      ['?event=KXNFLGAME-1&market=KXNFLGAME-1', 'KXNFLGAME-1'],
    ])('reads %s as Polymarket market %s', (path, marketId) => {
      const link = parse(path);

      expect(link.venue).toBeNull();
      expect(readable(link.intent)).toStrictEqual(polymarketEvent(marketId));
    });

    it.each<[string, Record<string, string | undefined>]>([
      ['', {}],
      ['predict?', {}],
      ['?market=', {}],
      ['?tab=CRYPTO', { tab: 'crypto' }],
      ['?q=bitcoin', { query: 'bitcoin' }],
      ['?query=bitcoin&q=ethereum', { query: 'bitcoin' }],
      [
        '?feed=Sports&tab=all&filter=Live',
        { feed: 'sports', tab: 'all', filter: 'live' },
      ],
      ['?event=KXNFLGAME-1', {}],
    ])('reads %s as list parameters', (path, params) => {
      expect(parse(path)).toStrictEqual({
        venue: null,
        intent: {
          type: 'linkList',
          feed: undefined,
          tab: undefined,
          filter: undefined,
          query: undefined,
          ...params,
          entryPoint: 'deeplink',
        },
      });
    });
  });

  describe('venue-marked links', () => {
    it('reads a Kalshi Event by its ticker, case kept', () => {
      const link = parse('?venue=Kalshi&event=KXHIGHNY-24JAN01');

      expect(link.venue).toBe('kalshi');
      expect(readable(link.intent)).toStrictEqual({
        type: 'event',
        eventRef: {
          implementation: 'next',
          venue: 'kalshi',
          eventId: 'KXHIGHNY-24JAN01',
        },
        entryPoint: 'deeplink',
      });
    });

    it('reads a Kalshi Feed Screen and tab', () => {
      expect(
        parse('?venue=kalshi&feed=sports-football-nfl&tab=games'),
      ).toStrictEqual({
        venue: 'kalshi',
        intent: {
          type: 'feedScreen',
          feedScreenId: 'sports-football-nfl',
          tabId: 'games',
          entryPoint: 'deeplink',
        },
      });
    });

    it('lowercases a Kalshi Feed Screen and tab, as Polymarket list params are', () => {
      expect(
        parse('?venue=kalshi&feed=Sports-Football-NFL&tab=Props').intent,
      ).toStrictEqual({
        type: 'feedScreen',
        feedScreenId: 'sports-football-nfl',
        tabId: 'props',
        entryPoint: 'deeplink',
      });
    });

    it('reads a bare Kalshi marker as its Home', () => {
      expect(parse('?venue=kalshi')).toStrictEqual({
        venue: 'kalshi',
        intent: { type: 'home', entryPoint: 'deeplink' },
      });
    });

    it.each([
      '?venue=kalshi&market=KXNFLGAME-1-BUF',
      '?venue=kalshi&marketId=1',
    ])(
      'opens nothing for a Kalshi market, which names no Event: %s',
      (path) => {
        expect(parse(path)).toStrictEqual({ venue: 'kalshi', intent: null });
      },
    );

    it.each([
      '?venue=polymarket&market=23246',
      '?venue=polymarket&event=23246',
    ])('reads %s as a Polymarket market', (path) => {
      const link = parse(path);

      expect(link.venue).toBe('polymarket');
      expect(readable(link.intent)).toStrictEqual(polymarketEvent('23246'));
    });

    it('reads Polymarket-marked list parameters as before', () => {
      expect(parse('?venue=polymarket&tab=crypto').intent).toStrictEqual({
        type: 'linkList',
        feed: undefined,
        tab: 'crypto',
        filter: undefined,
        query: undefined,
        entryPoint: 'deeplink',
      });
    });

    it.each(['?venue=limitless&event=1', '?venue=myriad'])(
      'opens nothing for an unknown Venue: %s',
      (path) => {
        expect(parse(path)).toStrictEqual({ venue: null, intent: null });
      },
    );
  });

  describe('attribution', () => {
    it.each<[string, string | undefined, string]>([
      ['?market=1', undefined, 'deeplink'],
      ['?market=1', 'carousel', 'carousel'],
      ['?market=1&utm_source=twitter', undefined, 'deeplink_twitter'],
      ['?market=1&utm_source=test', 'notification', 'notification_test'],
      ['?market=1&utm_source=carousel', 'carousel', 'carousel'],
      ['?market=1&utm_source=deeplink', undefined, 'deeplink'],
      ['?venue=kalshi&event=K-1&utm_source=x', 'braze', 'braze_x'],
      ['?venue=kalshi&feed=f&utm_source=x', undefined, 'deeplink_x'],
      ['?venue=kalshi&utm_source=x', undefined, 'deeplink_x'],
    ])(
      'gives %s from origin %s the entry point %s',
      (path, origin, expected) => {
        expect(parse(path, origin).intent).toHaveProperty(
          'entryPoint',
          expected,
        );
      },
    );
  });
});
