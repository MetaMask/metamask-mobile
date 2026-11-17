import type { PredictEntityId } from '../../types';
import {
  createLegacyPredictEventRef,
  createNextPredictEventRef,
  createPredictCampaignEventRef,
  readPredictEventRef,
  type PredictEventRef,
} from './eventRef';

const takesKalshiRef = (eventRef: PredictEventRef<'kalshi'>) => eventRef;
const takesAnyRef = (eventRef: PredictEventRef) => eventRef;
const takesPolymarketRef = (eventRef: PredictEventRef<'polymarket'>) =>
  eventRef;

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

  describe('minted for a Rewards campaign', () => {
    const campaignRef = createPredictCampaignEventRef(
      'predict-the-pitch',
      'event-1',
    );

    it('takes its Venue from the campaign, in its type', () => {
      takesPolymarketRef(campaignRef);
      // @ts-expect-error A Polymarket campaign's Event is not a Kalshi Event.
      takesKalshiRef(campaignRef);
      // @ts-expect-error Only campaigns Predict knows can mint a reference.
      createPredictCampaignEventRef('unknown-campaign', 'event-1');

      expect(readPredictEventRef(campaignRef).venue).toBe('polymarket');
    });

    it('holds the legacy market details identity of a Polymarket campaign Event', () => {
      expect(readPredictEventRef(campaignRef)).toStrictEqual({
        implementation: 'legacy',
        venue: 'polymarket',
        marketId: 'event-1',
        providerId: 'polymarket',
      });
      expect(Object.isFrozen(campaignRef)).toBe(true);
    });
  });

  it('is immutable', () => {
    expect(Object.isFrozen(kalshiRef)).toBe(true);
  });
});
