import {
  MOCK_PREDICT_MARKET,
  MOCK_PREDICT_CLOSED_MARKET,
} from '../../../../../../../tests/component-view/fixtures/predict';
import type { PredictMarket } from '../../../../Predict/types';
import { readPredictEventRef } from '../../../navigation/entry/eventRef';
import type { PredictIntent } from '../../../navigation/entry';
import {
  toPredictSearchResult,
  toPredictSearchResults,
} from './toPredictSearchResult';

const readEventIntent = (intent: PredictIntent) => {
  if (intent.type !== 'event') {
    throw new Error(`Expected an event intent, got ${intent.type}`);
  }
  const { eventRef, ...rest } = intent;
  return { ...rest, eventRef: readPredictEventRef(eventRef) };
};

describe('toPredictSearchResult', () => {
  it('maps an open market to its title, "Open", its image and a legacy event intent', () => {
    const market: PredictMarket = {
      ...MOCK_PREDICT_MARKET,
      image: 'https://example.com/btc.png',
    };

    const result = toPredictSearchResult(market);

    expect(result).toEqual({
      id: market.id,
      title: market.title,
      subtitle: 'Open',
      imageUrl: 'https://example.com/btc.png',
      intent: expect.objectContaining({ type: 'event' }),
    });
    expect(readEventIntent(result.intent)).toEqual({
      type: 'event',
      eventRef: {
        implementation: 'legacy',
        venue: 'polymarket',
        marketId: market.id,
        providerId: market.providerId,
      },
    });
  });

  it.each(['closed', 'resolved'] as const)(
    'shows a %s market with its raw status',
    (status) => {
      const result = toPredictSearchResult({
        ...MOCK_PREDICT_CLOSED_MARKET,
        status,
      });

      expect(result.subtitle).toBe(status);
    },
  );

  it('leaves the image out when the market has none', () => {
    const result = toPredictSearchResult({ ...MOCK_PREDICT_MARKET, image: '' });

    expect(result).not.toHaveProperty('imageUrl');
  });

  it('carries no legacy market data beyond the display values and intent', () => {
    const result = toPredictSearchResult(MOCK_PREDICT_MARKET);

    expect(Object.keys(result).sort()).toEqual(
      ['id', 'intent', 'subtitle', 'title'].sort(),
    );
    expect(Object.keys(readEventIntent(result.intent)).sort()).toEqual([
      'eventRef',
      'type',
    ]);
  });
});

describe('toPredictSearchResults', () => {
  it('keeps the search order and drops markets without an id', () => {
    const second: PredictMarket = { ...MOCK_PREDICT_MARKET, id: 'market-2' };
    const markets = [
      MOCK_PREDICT_MARKET,
      { ...MOCK_PREDICT_MARKET, id: '' },
      undefined as unknown as PredictMarket,
      second,
    ];

    const results = toPredictSearchResults(markets);

    expect(results.map(({ id }) => id)).toEqual([
      MOCK_PREDICT_MARKET.id,
      'market-2',
    ]);
  });
});
