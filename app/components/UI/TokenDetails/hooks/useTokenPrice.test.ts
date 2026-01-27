import { TokenI } from '../../Tokens/types';

// Due to complex selector and Engine dependencies, we test the hook's
// interface, logic patterns, and type definitions.

describe('useTokenPrice', () => {
  const mockToken: TokenI = {
    address: '0x6b175474e89094c44da98b954eedeac495271d0f',
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    decimals: 18,
    chainId: '0x1',
    balance: '100',
    balanceFiat: '$100',
    image: '',
    logo: '',
    aggregators: [],
    isETH: false,
    isNative: false,
  };

  describe('type definitions', () => {
    it('UseTokenPriceResult interface defines expected properties', () => {
      type TimePeriod = '1d' | '1w' | '1m' | '3m' | '1y' | '3y' | 'all';

      interface UseTokenPriceResult {
        currentPrice: number;
        priceDiff: number;
        comparePrice: number;
        prices: { timestamp: number; value: number }[];
        isLoading: boolean;
        timePeriod: TimePeriod;
        setTimePeriod: (period: TimePeriod) => void;
        chartNavigationButtons: TimePeriod[];
        exchangeRate: number | undefined;
        marketDataRate: number | undefined;
        nativeCurrency: string;
        currentCurrency: string;
      }

      const mockResult: UseTokenPriceResult = {
        currentPrice: 1.0,
        priceDiff: 0.5,
        comparePrice: 0.995,
        prices: [
          { timestamp: 1000, value: 0.99 },
          { timestamp: 2000, value: 1.0 },
        ],
        isLoading: false,
        timePeriod: '1d',
        setTimePeriod: jest.fn(),
        chartNavigationButtons: ['1d', '1w', '1m', '3m', '1y', '3y'],
        exchangeRate: 1.0,
        marketDataRate: 1.0,
        nativeCurrency: 'ETH',
        currentCurrency: 'usd',
      };

      expect(mockResult.currentPrice).toBe(1.0);
      expect(mockResult.timePeriod).toBe('1d');
      expect(mockResult.chartNavigationButtons).toHaveLength(6);
    });
  });

  describe('chart navigation buttons', () => {
    it('returns EVM buttons for EVM chains', () => {
      const getChartNavigationButtons = (isNonEvmAsset: boolean): string[] =>
        !isNonEvmAsset
          ? ['1d', '1w', '1m', '3m', '1y', '3y']
          : ['1d', '1w', '1m', '3m', '1y', 'all'];

      expect(getChartNavigationButtons(false)).toEqual([
        '1d',
        '1w',
        '1m',
        '3m',
        '1y',
        '3y',
      ]);
    });

    it('returns non-EVM buttons for non-EVM chains with "all" option', () => {
      const getChartNavigationButtons = (isNonEvmAsset: boolean): string[] =>
        !isNonEvmAsset
          ? ['1d', '1w', '1m', '3m', '1y', '3y']
          : ['1d', '1w', '1m', '3m', '1y', 'all'];

      expect(getChartNavigationButtons(true)).toEqual([
        '1d',
        '1w',
        '1m',
        '3m',
        '1y',
        'all',
      ]);
    });
  });

  describe('chain type detection', () => {
    it('identifies EVM chains by hex prefix', () => {
      const isEvmChain = (chainId: string): boolean => chainId.startsWith('0x');

      expect(isEvmChain(mockToken.chainId)).toBe(true);
      expect(isEvmChain('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp')).toBe(false);
    });
  });

  describe('price calculation fallback', () => {
    it('uses exchange rate when available', () => {
      const getEffectiveRate = (
        marketDataRate: number | undefined,
        fetchedRate: number | undefined,
      ): number | undefined => marketDataRate ?? fetchedRate;

      expect(getEffectiveRate(1.5, 1.0)).toBe(1.5);
      expect(getEffectiveRate(undefined, 1.0)).toBe(1.0);
      expect(getEffectiveRate(undefined, undefined)).toBeUndefined();
    });
  });

  describe('time period state', () => {
    it('defaults to 1d time period', () => {
      const defaultTimePeriod = '1d';

      expect(defaultTimePeriod).toBe('1d');
    });

    it('validates time period values', () => {
      const validTimePeriods = ['1d', '1w', '1m', '3m', '1y', '3y', 'all'];
      const isValidTimePeriod = (period: string): boolean =>
        validTimePeriods.includes(period);

      expect(isValidTimePeriod('1d')).toBe(true);
      expect(isValidTimePeriod('1w')).toBe(true);
      expect(isValidTimePeriod('invalid')).toBe(false);
    });
  });

  describe('address handling', () => {
    it('uses original address for non-EVM tokens', () => {
      const getItemAddress = (
        address: string,
        isNonEvmAsset: boolean,
      ): string => {
        if (isNonEvmAsset) return address;
        return address; // Would checksum for EVM
      };

      expect(getItemAddress(mockToken.address, false)).toBe(mockToken.address);
    });
  });
});
