import {
  mapTradeInFlightToFeedItem,
  type TradeInFlightPreview,
} from './mapTradeInFlightToFeedItem';

const preview: TradeInFlightPreview = {
  tokenSymbol: 'PUMP',
  tokenAddress: '0xpump',
  chain: 'base',
  side: 'buy',
  costLabel: '$329.47',
  entryPriceLabel: '$0.08618',
};

describe('mapTradeInFlightToFeedItem', () => {
  it('maps local swap facts to a sparse spotShare card', () => {
    const item = mapTradeInFlightToFeedItem(preview, 'this is alpha');

    expect(item.variant).toBe('spotShare');
    if (item.variant !== 'spotShare') {
      return;
    }
    expect(item.comment).toBe('this is alpha');
    expect(item.asset.symbol).toBe('PUMP');
    expect(item.side).toBe('buy');
    expect(item.costLabel).toBe('$329.47');
    expect(item.entryPriceLabel).toBe('$0.08618');
    expect(item.showCopyTrade).toBe(false);
    expect(item.pnlLabel).toBe('');
    expect(item.holdTimeLabel).toBeUndefined();
  });

  it('maps a sell side without inventing copy trade', () => {
    const item = mapTradeInFlightToFeedItem({ ...preview, side: 'sell' }, '');

    expect(item.variant).toBe('spotShare');
    if (item.variant !== 'spotShare') {
      return;
    }
    expect(item.side).toBe('sell');
    expect(item.showCopyTrade).toBe(false);
  });
});
