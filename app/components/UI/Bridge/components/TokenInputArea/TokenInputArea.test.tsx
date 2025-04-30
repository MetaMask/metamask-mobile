import { getDisplayFiatValue } from '.';
import { Hex } from '@metamask/utils';

describe('getDisplayFiatValue', () => {
  const mockChainId = '0x1' as Hex;
  const mockTokenAddress = '0x0000000000000000000000000000000000000001' as Hex;
  const mockSolanaChainId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
  const mockSolanaTokenAddress = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as const;
  const mockSplTokenAddress = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as const;

  const mockToken = {
    address: mockTokenAddress,
    chainId: mockChainId,
    symbol: 'TOKEN1',
    decimals: 18,
    image: 'https://token1.com/logo.png',
    name: 'Token One',
    balance: '1',
    balanceFiat: '$20000',
    tokenFiatAmount: 20000,
  };

  const mockSolanaToken = {
    address: mockSolanaTokenAddress,
    chainId: mockSolanaChainId,
    symbol: 'SOL',
    decimals: 9,
    image: 'https://solana.com/logo.png',
    name: 'Solana',
    balance: '1',
  };

  const mockSplToken = {
    address: mockSplTokenAddress,
    chainId: mockSolanaChainId,
    symbol: 'USDC',
    decimals: 6,
    image: 'https://usdc.com/logo.png',
    name: 'USD Coin',
    balance: '1',
  };

  const mockNetworkConfigurations = {
    [mockChainId]: {
      chainId: mockChainId,
      nativeCurrency: 'ETH',
    },
  };

  const mockMultiChainMarketData = {
    [mockChainId]: {
      [mockTokenAddress]: {
        tokenAddress: mockTokenAddress,
        price: 10,
      },
    },
  };

  const mockMultiChainCurrencyRates = {
    ETH: {
      conversionRate: 2000,
    },
  };

  const mockNonEvmMultichainAssetRates = {
    [mockSolanaTokenAddress]: {
      conversionTime: 1745436145391,
      currency: 'swift:0/iso4217:USD',
      expirationTime: 1745439745391,
      marketData: {
        allTimeHigh: '293.31',
        allTimeLow: '0.500801',
        circulatingSupply: '517313513.4593564',
        marketCap: '78479310083',
        pricePercentChange: {},
        totalVolume: '6225869757',
      },
      rate: '151.7',
    },
    [mockSplTokenAddress]: {
      conversionTime: 1745436145392,
      currency: 'swift:0/iso4217:USD',
      expirationTime: 1745439745392,
      marketData: {
        allTimeHigh: '1.17',
        allTimeLow: '0.877647',
        circulatingSupply: '61517136784.14079',
        marketCap: '61511872061',
        pricePercentChange: {},
        totalVolume: '13352880710',
      },
      rate: '0.999915',
    },
  };

  it('should return zero when token is undefined', () => {
    const result = getDisplayFiatValue({
      token: undefined,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    expect(result).toBe('$0');
  });

  it('should return zero when amount is undefined', () => {
    const result = getDisplayFiatValue({
      token: mockToken,
      amount: undefined,
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    expect(result).toBe('$0');
  });

  it('should calculate correct fiat value for token amount', () => {
    const result = getDisplayFiatValue({
      token: mockToken,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    // 1 TOKEN1 = 10 ETH, 1 ETH = $2000, so 1 TOKEN1 = $20000
    expect(result).toBe('$20000');
  });

  it('should return "< $0.01" for very small fiat values', () => {
    const result = getDisplayFiatValue({
      token: mockToken,
      amount: '0.0000001',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    expect(result).toBe('< $0.01');
  });

  it('should handle different currencies correctly', () => {
    const result = getDisplayFiatValue({
      token: mockToken,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'EUR',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    // Currency symbol should be included
    expect(result).toBe('€20000');
  });

  it('should handle undefined market data correctly', () => {
    const result = getDisplayFiatValue({
      token: mockToken,
      amount: '1',
      multiChainMarketData: undefined,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    expect(result).toBe('$0');
  });

  it('should handle zero price correctly', () => {
    const noValueMarketData = {
      [mockChainId]: {
        [mockTokenAddress]: {
          tokenAddress: mockTokenAddress,
          price: 0,
        },
      },
    };

    const result = getDisplayFiatValue({
      token: mockToken,
      amount: '1',
      multiChainMarketData: noValueMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
      nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
    });

    expect(result).toBe('$0');
  });

  describe('Solana token tests', () => {
    it('should calculate correct fiat value for SOL amount', () => {
      const result = getDisplayFiatValue({
        token: mockSolanaToken,
        amount: '1',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      // 1 SOL = $151.7
      expect(result).toBe('$151.69999');
    });

    it('should calculate correct fiat value for SPL token amount', () => {
      const result = getDisplayFiatValue({
        token: mockSplToken,
        amount: '1',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      // 1 USDC = $0.999915
      expect(result).toBe('$0.99991');
    });

    it('should handle different currencies for Solana tokens', () => {
      const result = getDisplayFiatValue({
        token: mockSolanaToken,
        amount: '1',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'EUR',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('€151.69999');
    });

    it('should handle very small amounts for Solana tokens', () => {
      const result = getDisplayFiatValue({
        token: mockSolanaToken,
        amount: '0.0000001',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('< $0.01');
    });

    it('should handle undefined rates for Solana tokens', () => {
      const result = getDisplayFiatValue({
        token: mockSolanaToken,
        amount: '1',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: {},
      });

      expect(result).toBe('$0');
    });

    it('should handle zero rate for Solana tokens', () => {
      const zeroRateNonEvmMultichainAssetRates = {
        [mockSolanaTokenAddress]: {
          ...mockNonEvmMultichainAssetRates[mockSolanaTokenAddress],
          rate: '0',
        },
      };

      const result = getDisplayFiatValue({
        token: mockSolanaToken,
        amount: '1',
        multiChainMarketData: mockMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        multiChainCurrencyRates: mockMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: zeroRateNonEvmMultichainAssetRates,
      });

      expect(result).toBe('$0');
    });
  });
});
