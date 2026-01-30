import {
  PERPS_MIN_AGGREGATORS_FOR_TRUST,
  isTokenTrustworthyForPerps,
} from './perpsConfig';

describe('isTokenTrustworthyForPerps', () => {
  describe('native assets', () => {
    it('returns true for native asset (isNative: true)', () => {
      const asset = {
        isNative: true,
        isETH: false,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('returns true for ETH asset (isETH: true)', () => {
      const asset = {
        isNative: false,
        isETH: true,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('returns true for native asset even with no aggregators', () => {
      const asset = {
        isNative: true,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });
  });

  describe('non-native assets with aggregators', () => {
    it('returns true when aggregators count equals minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: Array(PERPS_MIN_AGGREGATORS_FOR_TRUST).fill('exchange'),
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('returns true when aggregators count exceeds minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: ['CoinGecko', 'CoinMarketCap', 'Uniswap'],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });

    it('returns false when aggregators count is below minimum threshold', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: ['CoinGecko'], // Only 1
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('returns false when aggregators is empty', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: [],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles undefined aggregators', () => {
      const asset = {
        isNative: false,
        isETH: false,
        aggregators: undefined,
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('handles missing properties', () => {
      const asset = {};

      expect(isTokenTrustworthyForPerps(asset)).toBe(false);
    });

    it('handles asset with only aggregators property', () => {
      const asset = {
        aggregators: ['CoinGecko', 'CoinMarketCap'],
      };

      expect(isTokenTrustworthyForPerps(asset)).toBe(true);
    });
  });
});

describe('PERPS_MIN_AGGREGATORS_FOR_TRUST', () => {
  it('is defined and is a number', () => {
    expect(typeof PERPS_MIN_AGGREGATORS_FOR_TRUST).toBe('number');
  });

  it('equals 2', () => {
    expect(PERPS_MIN_AGGREGATORS_FOR_TRUST).toBe(2);
  });
});
