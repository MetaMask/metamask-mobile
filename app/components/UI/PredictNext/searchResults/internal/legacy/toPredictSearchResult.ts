import type { PredictMarket } from '../../../../Predict/types';
import { createLegacyPredictEventRef } from '../../../navigation/entry';
import type { PredictSearchResult } from '../../types';

/**
 * Maps a legacy Polymarket search market to a venue-neutral result, with the
 * values Browser autocomplete showed before PRED-1386: the market title, "Open"
 * or the raw status, and the market image. The intent opens the market
 * details screen exactly as Browser did, with no entry point or snapshots.
 */
export const toPredictSearchResult = (
  market: PredictMarket,
): PredictSearchResult => ({
  id: market.id,
  title: market.title,
  subtitle: market.status === 'open' ? 'Open' : market.status,
  ...(market.image ? { imageUrl: market.image } : {}),
  intent: {
    type: 'event',
    eventRef: createLegacyPredictEventRef({
      marketId: market.id,
      providerId: market.providerId,
    }),
  },
});

/**
 * Maps a page of legacy search markets, dropping entries without an id as
 * Browser autocomplete did.
 */
export const toPredictSearchResults = (
  markets: PredictMarket[],
): PredictSearchResult[] =>
  markets.filter((market) => market?.id).map(toPredictSearchResult);
