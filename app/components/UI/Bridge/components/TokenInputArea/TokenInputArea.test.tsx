import { getDisplayFiatValue } from '.';
import { Hex } from '@metamask/utils';
import { TokenI } from '../../../Tokens/types';

describe('getDisplayFiatValue', () => {
  const mockChainId = '0x1' as Hex;
  const mockTokenAddress = '0x0000000000000000000000000000000000000001' as Hex;

  const mockToken = {
    address: mockTokenAddress,
    chainId: mockChainId,
    symbol: 'TOKEN1',
    decimals: 18,
    image: 'https://token1.com/logo.png',
    name: 'Token One',
    aggregators: ['1inch'],
    isETH: false,
    isNative: false,
    isStaked: false,
    balance: '1',
    balanceFiat: '$20000',
    logo: 'https://token1.com/logo.png',
    tokenFiatAmount: 20000,
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

  it('should return zero when token is undefined', () => {
    const result = getDisplayFiatValue({
      token: undefined,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
    });

    expect(result).toBe('$0');
  });

  it('should return zero when amount is undefined', () => {
    const result = getDisplayFiatValue({
      token: mockToken as TokenI,
      amount: undefined,
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
    });

    expect(result).toBe('$0');
  });

  it('should calculate correct fiat value for token amount', () => {
    const result = getDisplayFiatValue({
      token: mockToken as TokenI,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
    });

    // 1 TOKEN1 = 10 ETH, 1 ETH = $2000, so 1 TOKEN1 = $20000
    expect(result).toBe('$20000');
  });

  it('should return "< $0.01" for very small fiat values', () => {
    const result = getDisplayFiatValue({
      token: mockToken as TokenI,
      amount: '0.0000001',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
    });

    expect(result).toBe('< $0.01');
  });

  it('should handle different currencies correctly', () => {
    const result = getDisplayFiatValue({
      token: mockToken as TokenI,
      amount: '1',
      multiChainMarketData: mockMultiChainMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'EUR',
    });

    // Currency symbol should be included
    expect(result).toBe('€20000');
  });

  it('should handle undefined market data correctly', () => {
    const result = getDisplayFiatValue({
      token: mockToken as TokenI,
      amount: '1',
      multiChainMarketData: undefined,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
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
      token: mockToken as TokenI,
      amount: '1',
      multiChainMarketData: noValueMarketData,
      networkConfigurationsByChainId: mockNetworkConfigurations,
      multiChainCurrencyRates: mockMultiChainCurrencyRates,
      currentCurrency: 'USD',
    });

    expect(result).toBe('$0');
  });
});
