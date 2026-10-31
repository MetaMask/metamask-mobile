import { KALSHI_VENUE_CHAIN_ID } from '../../../../../../util/activity-adapters';
import type {
  PredictActivityEntry,
  PredictSettlementEntry,
  PredictTradeEntry,
} from '../../../types';
import { mapActivityEntry } from './mapActivityEntry';
import { getVenueActivityChainId } from './venueActivityChainId';

const context = {
  eventId: 'KXNFLGAME-26OCT25KCBUF',
  eventTitle: 'Kansas City at Buffalo',
  marketQuestion: 'Kansas City to win?',
  outcomeLabel: 'Kansas City',
  imageUrl: 'https://example.com/kc-buf.png',
} as PredictTradeEntry['context'];

const sell = {
  type: 'trade',
  venueId: 'kalshi',
  id: '0199f6a0-8c1e-7b3a-9d2e-4f1a2b3c4d5e',
  marketId: 'KXNFLGAME-26OCT25KCBUF-KC',
  side: 'yes',
  action: 'sell',
  shares: '10',
  price: '0.61',
  amount: '5.93',
  fee: '0.17',
  realizedPnl: '0.27',
  timestamp: '2026-10-22T18:04:11.532Z',
  context,
} as PredictTradeEntry;

const settlement = {
  type: 'settlement',
  venueId: 'kalshi',
  id: 'settlement-utah-byu-no-20261019',
  marketId: 'KXNCAAFGAME-18OCT25UTAHBYU-UTAH',
  side: 'no',
  shares: '8',
  result: 'yes',
  proceeds: '0',
  realizedPnl: '-3.36',
  timestamp: '2026-10-19T04:12:00.000Z',
} as PredictSettlementEntry;

const map = (entry: PredictActivityEntry) =>
  mapActivityEntry(entry, KALSHI_VENUE_CHAIN_ID);

describe('mapActivityEntry', () => {
  it('maps a sell to a Cash Out credit keyed by the canonical id', () => {
    expect(map(sell)).toEqual({
      type: 'predictionCashedOut',
      chainId: 'kalshi:mainnet',
      status: 'success',
      timestamp: Date.parse('2026-10-22T18:04:11.532Z'),
      hash: '0199f6a0-8c1e-7b3a-9d2e-4f1a2b3c4d5e',
      data: {
        token: {
          amount: '5.93',
          symbol: 'USD',
          direction: 'in',
          amountIsHumanReadable: true,
        },
        eventTitle: 'Kansas City at Buffalo',
        icon: 'https://example.com/kc-buf.png',
      },
    });
  });

  it('maps a buy to a placed prediction debit', () => {
    const item = map({
      ...sell,
      action: 'buy',
      realizedPnl: undefined,
    } as PredictTradeEntry);

    expect(item.type).toBe('predictionPlaced');
    expect(item.data).toMatchObject({
      token: { amount: '5.93', direction: 'out' },
    });
  });

  it('maps a Settlement with its typed extras, and no context', () => {
    expect(map(settlement)).toEqual({
      type: 'predictionSettled',
      chainId: 'kalshi:mainnet',
      status: 'success',
      timestamp: Date.parse('2026-10-19T04:12:00.000Z'),
      hash: 'settlement-utah-byu-no-20261019',
      data: {
        token: {
          amount: '0',
          symbol: 'USD',
          direction: 'in',
          amountIsHumanReadable: true,
        },
        eventTitle: undefined,
        icon: undefined,
        outcomeLabel: undefined,
        marketQuestion: undefined,
        side: 'no',
        result: 'yes',
        shares: '8',
        realizedPnl: '-3.36',
      },
    });
  });

  it('carries the Settlement context and leaves an unknown PnL absent', () => {
    const item = map({
      ...settlement,
      realizedPnl: undefined,
      context,
    } as PredictSettlementEntry);

    expect(item.data).toMatchObject({
      outcomeLabel: 'Kansas City',
      marketQuestion: 'Kansas City to win?',
      eventTitle: 'Kansas City at Buffalo',
      icon: 'https://example.com/kc-buf.png',
    });
    expect(item.data).not.toHaveProperty('realizedPnl', expect.anything());
  });
});

describe('getVenueActivityChainId', () => {
  it('keys Kalshi by its venue chain id, never a real chain', () => {
    expect(getVenueActivityChainId('kalshi' as never)).toBe('kalshi:mainnet');
  });

  it('has no chain id for a Venue without Activity or no Venue', () => {
    expect(getVenueActivityChainId('polymarket' as never)).toBeUndefined();
    expect(getVenueActivityChainId(undefined)).toBeUndefined();
  });
});
