import {
  getTrackedQuickBuyTrade,
  getTrackedQuickBuyTradeIds,
  trackQuickBuyTrade,
  untrackQuickBuyTrade,
  type TrackedQuickBuyTrade,
} from './quickBuyTradeTracker';

const buyTrade: TrackedQuickBuyTrade = {
  tradeMode: 'buy',
  tokenSymbol: 'PEPE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$50.00',
  rate: '1 USDC = 1,000 PEPE',
};

const sellTrade: TrackedQuickBuyTrade = {
  tradeMode: 'sell',
  tokenSymbol: 'DOGE',
  counterTokenSymbol: 'USDC',
  fiatAmountLabel: '$25.00',
};

describe('quickBuyTradeTracker', () => {
  afterEach(() => {
    getTrackedQuickBuyTradeIds().forEach(untrackQuickBuyTrade);
  });

  it('stores and returns a tracked trade by tx meta id', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    expect(getTrackedQuickBuyTrade('tx-1')).toEqual(buyTrade);
  });

  it('returns undefined for an unknown tx meta id', () => {
    expect(getTrackedQuickBuyTrade('missing')).toBeUndefined();
  });

  it('lists all tracked tx meta ids', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    trackQuickBuyTrade('tx-2', sellTrade);

    expect(getTrackedQuickBuyTradeIds().sort()).toEqual(['tx-1', 'tx-2']);
  });

  it('overwrites the info when the same id is tracked again', () => {
    trackQuickBuyTrade('tx-1', buyTrade);
    trackQuickBuyTrade('tx-1', sellTrade);

    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
    expect(getTrackedQuickBuyTrade('tx-1')).toEqual(sellTrade);
  });

  it('removes a tracked trade on untrack', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    untrackQuickBuyTrade('tx-1');

    expect(getTrackedQuickBuyTrade('tx-1')).toBeUndefined();
    expect(getTrackedQuickBuyTradeIds()).toEqual([]);
  });

  it('ignores untracking an unknown id', () => {
    trackQuickBuyTrade('tx-1', buyTrade);

    expect(() => untrackQuickBuyTrade('missing')).not.toThrow();
    expect(getTrackedQuickBuyTradeIds()).toEqual(['tx-1']);
  });
});
