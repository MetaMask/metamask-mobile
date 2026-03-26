import { groupPortfolioPositionsByAsset } from './OndoCampaignPortfolio.utils';

describe('groupPortfolioPositionsByAsset', () => {
  it('merges rows with the same tokenAsset', () => {
    const merged = groupPortfolioPositionsByAsset([
      {
        tokenSymbol: 'A',
        tokenName: 'A',
        tokenAsset: 'eip155:1/erc20:0xabc',
        units: '10',
        costBasis: '100',
        avgCostPerUnit: '10',
        currentPrice: '11',
        currentValue: '110',
        unrealizedPnl: '10',
        unrealizedPnlPercent: '0.1',
      },
      {
        tokenSymbol: 'A',
        tokenName: 'A',
        tokenAsset: 'eip155:1/erc20:0xabc',
        units: '5',
        costBasis: '50',
        avgCostPerUnit: '10',
        currentPrice: '11',
        currentValue: '55',
        unrealizedPnl: '5',
        unrealizedPnlPercent: '0.1',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].units).toBe('15');
    expect(merged[0].costBasis).toBe('150.000000');
    expect(merged[0].currentValue).toBe('165.000000');
    expect(merged[0].unrealizedPnl).toBe('15.000000');
  });

  it('returns one row per distinct tokenAsset', () => {
    const merged = groupPortfolioPositionsByAsset([
      {
        tokenSymbol: 'A',
        tokenName: 'A',
        tokenAsset: 'eip155:1/erc20:0xaaa',
        units: '1',
        costBasis: '1',
        avgCostPerUnit: '1',
        currentPrice: '1',
        currentValue: '1',
        unrealizedPnl: '0',
        unrealizedPnlPercent: '0',
      },
      {
        tokenSymbol: 'B',
        tokenName: 'B',
        tokenAsset: 'eip155:1/erc20:0xbbb',
        units: '2',
        costBasis: '2',
        avgCostPerUnit: '1',
        currentPrice: '1',
        currentValue: '2',
        unrealizedPnl: '0',
        unrealizedPnlPercent: '0',
      },
    ]);

    expect(merged).toHaveLength(2);
  });
});
