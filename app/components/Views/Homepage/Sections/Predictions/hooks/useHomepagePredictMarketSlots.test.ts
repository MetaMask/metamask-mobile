import {
  Recurrence,
  type PredictMarket,
} from '../../../../../UI/Predict/types';
import { orderHomepagePredictEventMarkets } from './useHomepagePredictMarketSlots';

const createMarket = (
  id: string,
  slug: string,
  title: string,
): PredictMarket => ({
  id,
  providerId: 'polymarket',
  slug,
  title,
  description: title,
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'sports',
  tags: ['sports'],
  outcomes: [],
  liquidity: 1_000_000,
  volume: 500_000,
});

describe('orderHomepagePredictEventMarkets', () => {
  it('returns configured events in slot order', () => {
    const serieA = createMarket(
      '659488',
      'serie-a-2027-champion-20260701200118390',
      'Serie A',
    );
    const bundesliga = createMarket(
      '681261',
      'bundesliga-2027-champion-20260708164840303',
      'Bundesliga',
    );
    const laLiga = createMarket(
      '659548',
      'laliga-2027-champion-20260701200737375',
      'La Liga',
    );
    const epl = createMarket(
      '659518',
      'epl-2027-champion-20260701200428749',
      'EPL',
    );

    const result = orderHomepagePredictEventMarkets([
      serieA,
      bundesliga,
      laLiga,
      epl,
    ]);

    expect(result).toEqual([epl, laLiga, bundesliga, serieA]);
  });

  it('excludes an event when its slug does not match config', () => {
    const staleEvent = createMarket('659518', 'reassigned-event', 'Unexpected');

    const result = orderHomepagePredictEventMarkets([staleEvent]);

    expect(result).toEqual([]);
  });
});
