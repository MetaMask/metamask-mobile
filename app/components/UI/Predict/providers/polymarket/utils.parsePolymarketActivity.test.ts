import { parsePolymarketActivity } from './utils';

describe('parsePolymarketActivity', () => {
  it('returns empty array for non-array input', () => {
    // @ts-expect-error testing invalid input
    expect(parsePolymarketActivity(null)).toEqual([]);
    // @ts-expect-error testing invalid input
    expect(parsePolymarketActivity(undefined)).toEqual([]);
  });

  it('maps TRADE BUY to buy entries', () => {
    const input = [
      {
        type: 'TRADE',
        side: 'BUY',
        timestamp: 1000,
        usdcSize: 12.34,
        price: 0.56,
        conditionId: 'cid-1',
        title: 'Market A',
        outcome: 'Yes',
        icon: 'https://a.png',
        transactionHash: '0xhash1',
      },
    ];
    const result = parsePolymarketActivity(input);
    expect(result[0].entry.type).toBe('buy');
    expect(result[0].entry.price).toBe(0.56);
    expect(result[0].entry.amount).toBe(12.34);
    expect(result[0].outcome).toBe('Yes');
    expect(result[0].title).toBe('Market A');
    expect(result[0].icon).toBe('https://a.png');
  });

  it('maps TRADE SELL to sell entries', () => {
    const input = [
      {
        type: 'TRADE',
        side: 'SELL',
        timestamp: 2000,
        usdcSize: 9.99,
        price: 0.12,
        conditionId: 'cid-2',
        transactionHash: '0xhash2',
      },
    ];
    const result = parsePolymarketActivity(input);
    expect(result[0].entry.type).toBe('sell');
    expect(result[0].entry.price).toBe(0.12);
    expect(result[0].entry.amount).toBe(9.99);
    expect(result[0].entry.outcomeId).toBe('cid-2');
  });

  it('maps non-TRADE to claimWinnings entries and handles defaults', () => {
    const input = [
      {
        type: 'REDEEM',
        timestamp: 3000,
        usdcSize: 1.23,
        transactionHash: '0xhash3',
      },
    ];
    const result = parsePolymarketActivity(input);
    expect(result[0].entry.type).toBe('claimWinnings');
    expect(result[0].entry.amount).toBe(1.23);
    expect(result[0].id).toBe('0xhash3');
  });

  it('generates fallback id and timestamp when missing', () => {
    const input = [
      {
        type: 'TRADE',
        side: 'BUY',
      },
    ];
    const result = parsePolymarketActivity(input);
    expect(result[0].id).toBeDefined();
    expect(typeof result[0].entry.timestamp).toBe('number');
  });
});
