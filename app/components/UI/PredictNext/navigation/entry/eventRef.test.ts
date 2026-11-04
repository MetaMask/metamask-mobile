import type { PredictEntityId } from '../../types';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
  readPredictEventRef,
  type PredictEventRef,
} from './eventRef';

const takesKalshiRef = (eventRef: PredictEventRef<'kalshi'>) => eventRef;
const takesAnyRef = (eventRef: PredictEventRef) => eventRef;

describe('PredictEventRef', () => {
  const polymarketRef = createLegacyPredictEventRef({
    marketId: 'market-1',
    providerId: 'polymarket',
  });
  const kalshiRef = createNextPredictEventRef(
    'kalshi',
    'KXNFLGAME-1' as PredictEntityId,
  );

  it('is Venue-qualified in its type', () => {
    takesKalshiRef(kalshiRef);
    takesAnyRef(kalshiRef);
    takesAnyRef(polymarketRef);
    // @ts-expect-error A Polymarket reference is not a Kalshi reference.
    takesKalshiRef(polymarketRef);
    // @ts-expect-error A reference of any Venue is not a Kalshi reference.
    takesKalshiRef(polymarketRef as PredictEventRef);

    expect(readPredictEventRef(polymarketRef).venue).toBe('polymarket');
  });

  it('is opaque to callers', () => {
    // @ts-expect-error Callers cannot build a reference from an id.
    takesAnyRef('market-1');
    // @ts-expect-error Callers cannot build a reference from its data.
    takesAnyRef({ venue: 'kalshi', eventId: 'KXNFLGAME-1' });
    // @ts-expect-error Callers cannot read a Venue's identifiers.
    expect(polymarketRef.marketId).toBe('market-1');
  });

  it('holds the legacy market details identity for a Polymarket market', () => {
    expect(readPredictEventRef(polymarketRef)).toStrictEqual({
      implementation: 'legacy',
      venue: 'polymarket',
      marketId: 'market-1',
      providerId: 'polymarket',
    });
  });

  it('holds the Venue and Event id for a PredictNext Event', () => {
    expect(readPredictEventRef(kalshiRef)).toStrictEqual({
      implementation: 'next',
      venue: 'kalshi',
      eventId: 'KXNFLGAME-1',
    });
  });

  it('is immutable', () => {
    expect(Object.isFrozen(kalshiRef)).toBe(true);
  });
});
