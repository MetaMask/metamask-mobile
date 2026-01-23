import {
  PERPS_MIN_AGGREGATORS_FOR_TRUST,
  isTokenTrustworthyForPerps,
} from './perpsConfig';

describe('isTokenTrustworthyForPerps', () => {
  describe('native assets', () => {
    it('should return true for native asset (isNative: true)', () => {
      const asset = {
        isNative: true,
        isETH: false,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('should return true for ETH asset (isETH: true)', () => {
      const asset = {
        isNative: false,
        isETH: true,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('should return true for native asset even with no aggregators', () => {
      const asset = {
        isNative: true,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });
  });

  describe('non-native assets with aggregators', () => {
    it('should return true when aggregators count equals minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: Array(PERPS_MIN_AGGREGATORS_FOR_TRUST).fill('exchange'),
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('should return true when aggregators count exceeds minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: ['CoinGecko', 'CoinMarketCap', 'Uniswap'],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('should return false when aggregators count is below minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: ['CoinGecko'], // Only 1
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('should return false when aggregators is empty', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined aggregators', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: undefined,
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('should handle missing properties', () => {
      const asset = {};

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('should handle asset with only aggregators property', () => {
      const asset = {
        aggregators: ['CoinGecko', 'CoinMarketCap'],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });
  });
});

describe('PERPS_MIN_AGGREGATORS_FOR_TRUST', () => {
  it('should be defined and be a number', () => {
    expect(typeof PERPS_MIN_AGGREGATORS_FOR_TRUST).toBe('number');
  });

  it('should be 2', () => {
    expect(PERPS_MIN_AGGREGATORS_FOR_TRUST).toBe(2);
  });
});
