import {
  groupPortfolioPositionsByAsset,
  formatPnlPercent,
  isPnlNonNegative,
} from './OndoPortfolio.utils';

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

describe('formatPnlPercent', () => {
  it('formats a positive decimal as a signed percent', () => {
    expect(formatPnlPercent('0.0775')).toBe('+7.75%');
  });

  it('formats a negative decimal with minus sign', () => {
    expect(formatPnlPercent('-0.05')).toBe('-5.00%');
  });

  it('formats zero as +0.00%', () => {
    expect(formatPnlPercent('0')).toBe('+0.00%');
  });

  it('returns empty string for non-numeric value', () => {
    expect(formatPnlPercent('—')).toBe('');
  });

  it('returns empty string for empty string input', () => {
    expect(formatPnlPercent('')).toBe('');
  });
});

describe('isPnlNonNegative', () => {
  it('returns true for a positive value', () => {
    expect(isPnlNonNegative('0.1')).toBe(true);
  });

  it('returns true for zero', () => {
    expect(isPnlNonNegative('0')).toBe(true);
  });

  it('returns false for a negative value', () => {
    expect(isPnlNonNegative('-0.05')).toBe(false);
  });

  it('returns false for non-parseable value (BigNumber NaN is not >= 0)', () => {
    expect(isPnlNonNegative('—')).toBe(false);
  });
});
