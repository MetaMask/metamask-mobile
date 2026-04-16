import {
  groupPortfolioPositionsByAsset,
  formatPnlPercent,
  isPnlNonNegative,
  sanitizeTokenName,
} from './OndoPortfolio.utils';

describe('groupPortfolioPositionsByAsset', () => {
  it('merges rows with the same tokenAsset', () => {
    const merged = groupPortfolioPositionsByAsset([
      {
        tokenSymbol: 'A',
        tokenName: 'A',
        tokenAsset: 'eip155:1/erc20:0xabc',
        units: '10',
        bookPrice: '10',
        bookValue: '100',
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
        bookPrice: '10',
        bookValue: '50',
        currentPrice: '11',
        currentValue: '55',
        unrealizedPnl: '5',
        unrealizedPnlPercent: '0.1',
      },
    ]);

    expect(merged).toHaveLength(1);
    expect(merged[0].units).toBe('15');
    expect(merged[0].bookValue).toBe('150.000000');
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
        bookPrice: '1',
        bookValue: '1',
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
        bookPrice: '1',
        bookValue: '2',
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

describe('sanitizeTokenName', () => {
  it('strips "(Ondo Tokenized)" and trims', () => {
    expect(sanitizeTokenName('US Dollar (Ondo Tokenized)')).toBe('US Dollar');
  });

  it('is case-insensitive', () => {
    expect(sanitizeTokenName('Token (ondo tokenized)')).toBe('Token');
  });

  it('truncates to 28 characters with ellipsis', () => {
    expect(sanitizeTokenName('A Very Long Token Name That Exceeds')).toBe(
      'A Very Long Token Name That...',
    );
  });

  it('strips then truncates with ellipsis', () => {
    const long = 'Extremely Long Name Here That Keeps Going (Ondo Tokenized)';
    const result = sanitizeTokenName(long);
    expect(result).toBe('Extremely Long Name Here Tha...');
  });

  it('does not add ellipsis when exactly 28 characters', () => {
    expect(sanitizeTokenName('1234567890123456789012345678')).toBe(
      '1234567890123456789012345678',
    );
  });

  it('returns the name unchanged when no stripping or truncation is needed', () => {
    expect(sanitizeTokenName('OUSG')).toBe('OUSG');
  });

  it('handles empty string', () => {
    expect(sanitizeTokenName('')).toBe('');
  });
});
