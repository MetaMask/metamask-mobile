import { Account, Balances, Token, getSortedTokensByFiatValue, getFiatValue } from './token-list-utils';

describe('getSortedTokensByFiatValue', () => {
  const mockAccount: Account = {
    balance: '0x0',
  };

  const mockTokens: Token[] = [
    {
      address: '0x1',
      symbol: 'TOKEN1',
      decimals: 18,
      name: 'Token 1',
      iconUrl: '',
      type: 'ERC20',
      aggregators: [],
      blocked: false,
      occurrences: 1,
    },
    {
      address: '0x2',
      symbol: 'TOKEN2',
      decimals: 18,
      name: 'Token 2',
      iconUrl: '',
      type: 'ERC20',
      aggregators: [],
      blocked: false,
      occurrences: 1,
    },
  ];

  const mockBalances: Balances = {
    '0x1': '0x1BC16D674EC80000', // 2 tokens in hex
    '0x2': '0xDE0B6B3A7640000', // 1 token in hex
  };

  const mockTokenExchangeRates = {
    '0x1': {
      tokenAddress: '0x1',
      price: 1, // $1 per token
      currency: 'USD',
      id: '1',
      marketCap: 0,
      allTimeHigh: 0,
      allTimeLow: 0,
      totalVolume: 0,
      high1d: 0,
      low1d: 0,
      circulatingSupply: 0,
      dilutedMarketCap: 0,
      marketCapPercentChange1d: 0,
      priceChange1d: 0,
      pricePercentChange1h: 0,
      pricePercentChange1d: 0,
      pricePercentChange7d: 0,
      pricePercentChange14d: 0,
      pricePercentChange30d: 0,
      pricePercentChange200d: 0,
      pricePercentChange1y: 0,
    },
    '0x2': {
      tokenAddress: '0x2',
      price: 50, // $50 per token
      currency: 'USD',
      id: '2',
      marketCap: 0,
      allTimeHigh: 0,
      allTimeLow: 0,
      totalVolume: 0,
      high1d: 0,
      low1d: 0,
      circulatingSupply: 0,
      dilutedMarketCap: 0,
      marketCapPercentChange1d: 0,
      priceChange1d: 0,
      pricePercentChange1h: 0,
      pricePercentChange1d: 0,
      pricePercentChange7d: 0,
      pricePercentChange14d: 0,
      pricePercentChange30d: 0,
      pricePercentChange200d: 0,
      pricePercentChange1y: 0,
    },
  };

  it('should sort tokens by fiat value in descending order', () => {
    const result = getSortedTokensByFiatValue({
      tokens: mockTokens,
      account: mockAccount,
      tokenExchangeRates: mockTokenExchangeRates,
      balances: mockBalances,
      conversionRate: 1,
      currencyCode: 'usd',
    });

    // TOKEN1: 2 tokens * $1 = $2
    // TOKEN2: 1 token * $50 = $50
    expect(result[0].symbol).toBe('TOKEN2');
    expect(result[1].symbol).toBe('TOKEN1');
    expect(Number(result[0].balanceFiat)).toBeGreaterThan(Number(result[1].balanceFiat));
  });

  it('should handle tokens with no exchange rate', () => {
    const result = getSortedTokensByFiatValue({
      tokens: mockTokens,
      account: mockAccount,
      tokenExchangeRates: {},
      balances: mockBalances,
      conversionRate: 1,
      currencyCode: 'usd',
    });

    expect(result).toHaveLength(2);
    expect(result[0].balanceFiat).toBeUndefined();
    expect(result[1].balanceFiat).toBeUndefined();
  });
});

describe('getFiatValue', () => {
  it('should handle token with undefined address', () => {
    const tokenWithoutAddress: Token = {
      address: undefined as unknown as string, // simulating malformed data
      symbol: 'BAD',
      decimals: 18,
      name: 'Bad Token',
      iconUrl: '',
      type: 'ERC20',
      aggregators: [],
      blocked: false,
      occurrences: 1,
    };

    const result = getFiatValue({
      token: tokenWithoutAddress,
      tokenExchangeRates: {},
      balances: {},
      conversionRate: 1,
      currencyCode: 'usd',
    });

    expect(result).toEqual({
      balance: '0',
      balanceFiat: undefined,
    });
  });

  it('should handle token with no balance', () => {
    const token: Token = {
      address: '0x3',
      symbol: 'NO_BAL',
      decimals: 18,
      name: 'No Balance Token',
      iconUrl: '',
      type: 'ERC20',
      aggregators: [],
      blocked: false,
      occurrences: 1,
    };

    const result = getFiatValue({
      token,
      tokenExchangeRates: {
        '0x3': {
          tokenAddress: '0x3',
          price: 100,
          currency: 'USD',
          id: '3',
          marketCap: 0,
          allTimeHigh: 0,
          allTimeLow: 0,
          totalVolume: 0,
          high1d: 0,
          low1d: 0,
          circulatingSupply: 0,
          dilutedMarketCap: 0,
          marketCapPercentChange1d: 0,
          priceChange1d: 0,
          pricePercentChange1h: 0,
          pricePercentChange1d: 0,
          pricePercentChange7d: 0,
          pricePercentChange14d: 0,
          pricePercentChange30d: 0,
          pricePercentChange200d: 0,
          pricePercentChange1y: 0,
        }
      },
      balances: {}, // Empty balances object
      conversionRate: 1,
      currencyCode: 'usd',
    });

    expect(result).toEqual({
      balance: '0',
      balanceFiat: '0',
    });
  });
});
