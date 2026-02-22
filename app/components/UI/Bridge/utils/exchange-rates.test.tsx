import '../_mocks_/initialState';
import { SolScope } from '@metamask/keyring-api';
import { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import {
  calcTokenFiatValue,
  getDisplayCurrencyValue,
  fetchTokenExchangeRates,
} from './exchange-rates';
import { fetchTokenContractExchangeRates } from '@metamask/assets-controllers';

import { selectMultichainAssetsRates } from '../../../../selectors/multichain';

jest.mock('@metamask/controller-utils');
jest.mock('@metamask/assets-controllers');

describe('exchange-rates', () => {
  describe('calcTokenFiatValue', () => {
    const mockChainId = '0x1' as Hex;
    const mockTokenAddress =
      '0x0000000000000000000000000000000000000001' as Hex;
    const mockSolanaChainId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
    const mockSolanaTokenAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as const;

    const mockEvmToken = {
      address: mockTokenAddress,
      chainId: mockChainId,
      symbol: 'TOKEN1',
      decimals: 18,
      name: 'Token One',
      balance: '1',
    };

    const mockSolanaToken = {
      address: mockSolanaTokenAddress,
      chainId: mockSolanaChainId,
      symbol: 'SOL',
      decimals: 9,
      name: 'Solana',
      balance: '1',
    };

    const mockNetworkConfigurations = {
      [mockChainId]: {
        nativeCurrency: 'ETH',
      },
    };

    const mockEvmMultiChainMarketData = {
      [mockChainId]: {
        [mockTokenAddress]: {
          price: 10,
        },
      },
    };

    const mockEvmMultiChainCurrencyRates = {
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
          fungible: true,
          allTimeHigh: '293.31',
          allTimeLow: '0.500801',
          circulatingSupply: '517313513.4593564',
          marketCap: '78479310083',
          pricePercentChange: {},
          totalVolume: '6225869757',
        },
        rate: '151.7',
      },
    } as ReturnType<typeof selectMultichainAssetsRates>;

    it('returns 0 when token is undefined', () => {
      const result = calcTokenFiatValue({
        token: undefined,
        amount: '1',
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe(0);
    });

    it('returns 0 when amount is undefined', () => {
      const result = calcTokenFiatValue({
        token: mockEvmToken,
        amount: undefined,
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe(0);
    });

    describe('Non-EVM tokens (Solana)', () => {
      it('calculates fiat value using nonEvmMultichainAssetRates rate', () => {
        const result = calcTokenFiatValue({
          token: mockSolanaToken,
          amount: '2',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 2 * 151.7 = 303.4
        expect(result).toBe(303.39999);
      });

      it('falls back to currencyExchangeRate when rate is unavailable', () => {
        const tokenWithExchangeRate = {
          ...mockSolanaToken,
          currencyExchangeRate: 150,
        };

        const result = calcTokenFiatValue({
          token: tokenWithExchangeRate,
          amount: '2',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: {},
        });

        // 2 * 150 = 300
        expect(result).toBe(300);
      });

      it('returns 0 when no rate and no currencyExchangeRate available', () => {
        const result = calcTokenFiatValue({
          token: mockSolanaToken,
          amount: '2',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: {},
        });

        expect(result).toBe(0);
      });
    });

    describe('EVM tokens', () => {
      it('calculates fiat value using market data and conversion rate', () => {
        const result = calcTokenFiatValue({
          token: mockEvmToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 1 * 2000 (conversionRate) * 10 (price) = 20000
        expect(result).toBe(20000);
      });

      it('calculates fiat value for fractional amounts', () => {
        const result = calcTokenFiatValue({
          token: mockEvmToken,
          amount: '0.5',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 0.5 * 2000 * 10 = 10000
        expect(result).toBe(10000);
      });

      it('falls back to currencyExchangeRate when market data is undefined', () => {
        const tokenWithExchangeRate = {
          ...mockEvmToken,
          currencyExchangeRate: 15000,
        };

        const result = calcTokenFiatValue({
          token: tokenWithExchangeRate,
          amount: '2',
          evmMultiChainMarketData: undefined,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 2 * 15000 = 30000
        expect(result).toBe(30000);
      });

      it('falls back to currencyExchangeRate when conversion rate is null', () => {
        const tokenWithExchangeRate = {
          ...mockEvmToken,
          currencyExchangeRate: 15000,
        };

        const result = calcTokenFiatValue({
          token: tokenWithExchangeRate,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: {
            ETH: { conversionRate: null },
          },
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 1 * 15000 = 15000
        expect(result).toBe(15000);
      });

      it('falls back to currencyExchangeRate when token price is undefined', () => {
        const tokenWithExchangeRate = {
          ...mockEvmToken,
          currencyExchangeRate: 15000,
        };

        const result = calcTokenFiatValue({
          token: tokenWithExchangeRate,
          amount: '1',
          evmMultiChainMarketData: {
            [mockChainId]: {
              [mockTokenAddress]: { price: undefined },
            },
          },
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 1 * 15000 = 15000
        expect(result).toBe(15000);
      });

      it('returns 0 when no market data and no currencyExchangeRate available', () => {
        const result = calcTokenFiatValue({
          token: mockEvmToken,
          amount: '1',
          evmMultiChainMarketData: undefined,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        expect(result).toBe(0);
      });

      it('returns 0 when token price is zero', () => {
        const result = calcTokenFiatValue({
          token: mockEvmToken,
          amount: '1',
          evmMultiChainMarketData: {
            [mockChainId]: {
              [mockTokenAddress]: { price: 0 },
            },
          },
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        expect(result).toBe(0);
      });
    });
  });

  describe('getDisplayCurrencyValue', () => {
    const mockChainId = '0x1' as Hex;
    const mockTokenAddress =
      '0x0000000000000000000000000000000000000001' as Hex;
    const mockSolanaChainId =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp' as const;
    const mockSolanaTokenAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/slip44:501' as const;
    const mockSplTokenAddress =
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as const;

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

    const mockEvmMultiChainMarketData = {
      [mockChainId]: {
        [mockTokenAddress]: {
          tokenAddress: mockTokenAddress,
          price: 10,
        },
      },
    };

    const mockEvmMultiChainCurrencyRates = {
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
          fungible: true,
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
          fungible: true,
          allTimeHigh: '1.17',
          allTimeLow: '0.877647',
          circulatingSupply: '61517136784.14079',
          marketCap: '61511872061',
          pricePercentChange: {},
          totalVolume: '13352880710',
        },
        rate: '0.999915',
      },
    } as ReturnType<typeof selectMultichainAssetsRates>;

    it('should return zero when token is undefined', () => {
      const result = getDisplayCurrencyValue({
        token: undefined,
        amount: '1',
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('$0.00');
    });

    it('should return zero when amount is undefined', () => {
      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: undefined,
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('$0.00');
    });

    it('should calculate correct fiat value for token amount', () => {
      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: '1',
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      // 1 TOKEN1 = 10 ETH, 1 ETH = $2000, so 1 TOKEN1 = $20000
      expect(result).toBe('$20,000.00');
    });

    it('should return "< $0.01" for very small fiat values', () => {
      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: '0.0000001',
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('< $0.01');
    });

    it('should handle different currencies correctly', () => {
      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: '1',
        evmMultiChainMarketData: mockEvmMultiChainMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'EUR',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      // Currency symbol should be included
      expect(result).toBe('€20,000.00');
    });

    it('should handle undefined market data correctly', () => {
      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: '1',
        evmMultiChainMarketData: undefined,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('$0.00');
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

      const result = getDisplayCurrencyValue({
        token: mockToken,
        amount: '1',
        evmMultiChainMarketData: noValueMarketData,
        networkConfigurationsByChainId: mockNetworkConfigurations,
        evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
        currentCurrency: 'USD',
        nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
      });

      expect(result).toBe('$0.00');
    });

    describe('Solana token tests', () => {
      it('should calculate correct fiat value for SOL amount', () => {
        const result = getDisplayCurrencyValue({
          token: mockSolanaToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'USD',
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 1 SOL = $151.7
        expect(result).toBe('$151.70');
      });

      it('should calculate correct fiat value for SPL token amount', () => {
        const result = getDisplayCurrencyValue({
          token: mockSplToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'USD',
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        // 1 USDC = $0.999915
        expect(result).toBe('$1.00');
      });

      it('should handle different currencies for Solana tokens', () => {
        const result = getDisplayCurrencyValue({
          token: mockSolanaToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'EUR',
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        expect(result).toBe('€151.70');
      });

      it('should handle very small amounts for Solana tokens', () => {
        const result = getDisplayCurrencyValue({
          token: mockSolanaToken,
          amount: '0.0000001',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'USD',
          nonEvmMultichainAssetRates: mockNonEvmMultichainAssetRates,
        });

        expect(result).toBe('< $0.01');
      });

      it('should handle undefined rates for Solana tokens', () => {
        const result = getDisplayCurrencyValue({
          token: mockSolanaToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'USD',
          nonEvmMultichainAssetRates: {},
        });

        expect(result).toBe('$0.00');
      });

      it('should handle zero rate for Solana tokens', () => {
        const zeroRateNonEvmMultichainAssetRates = {
          [mockSolanaTokenAddress]: {
            ...mockNonEvmMultichainAssetRates[mockSolanaTokenAddress],
            rate: '0',
          },
        };

        const result = getDisplayCurrencyValue({
          token: mockSolanaToken,
          amount: '1',
          evmMultiChainMarketData: mockEvmMultiChainMarketData,
          networkConfigurationsByChainId: mockNetworkConfigurations,
          evmMultiChainCurrencyRates: mockEvmMultiChainCurrencyRates,
          currentCurrency: 'USD',
          nonEvmMultichainAssetRates: zeroRateNonEvmMultichainAssetRates,
        });

        expect(result).toBe('$0.00');
      });
    });
  });

  describe('fetchTokenExchangeRates', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('Solana chain', () => {
      const solanaChainId = SolScope.Mainnet;
      const tokenAddresses = ['token1', 'token2'];
      const currency = 'USD';

      it('should fetch exchange rates for Solana tokens', async () => {
        const mockResponse = {
          'sol:token1': { price: 1.5 },
          'sol:token2': { price: 2.5 },
        };
        (handleFetch as jest.Mock).mockResolvedValue(mockResponse);

        const result = await fetchTokenExchangeRates(
          solanaChainId,
          currency,
          ...tokenAddresses,
        );

        expect(handleFetch).toHaveBeenCalledWith(
          expect.stringContaining('price.api.cx.metamask.io/v3/spot-prices'),
        );
        expect(result).toEqual({
          'sol:token1': 1.5,
          'sol:token2': 2.5,
        });
      });

      it('should handle empty response for Solana tokens', async () => {
        (handleFetch as jest.Mock).mockResolvedValue({});

        const result = await fetchTokenExchangeRates(
          solanaChainId,
          currency,
          ...tokenAddresses,
        );

        expect(result).toEqual({});
      });
    });

    describe('EVM chain', () => {
      const evmChainId = '0x1';
      const tokenAddresses = ['0x123', '0x456'];
      const currency = 'USD';

      it('should fetch exchange rates for EVM tokens', async () => {
        const mockResponse = {
          '0x123': 1.5,
          '0x456': 2.5,
        };
        (fetchTokenContractExchangeRates as jest.Mock).mockResolvedValue(
          mockResponse,
        );

        const result = await fetchTokenExchangeRates(
          evmChainId,
          currency,
          ...tokenAddresses,
        );

        expect(result).toEqual({
          '0x123': 1.5,
          '0x456': 2.5,
        });
      });

      it('should handle empty response for EVM tokens', async () => {
        (fetchTokenContractExchangeRates as jest.Mock).mockResolvedValue({});

        const result = await fetchTokenExchangeRates(
          evmChainId,
          currency,
          ...tokenAddresses,
        );

        expect(result).toEqual({});
      });
    });

    describe('Error handling', () => {
      it('should handle fetch errors gracefully', async () => {
        (fetchTokenContractExchangeRates as jest.Mock).mockRejectedValue(
          new Error('API error'),
        );

        const result = await fetchTokenExchangeRates('0x1', 'USD', '0x123');

        expect(result).toEqual({});
      });
    });
  });
});
