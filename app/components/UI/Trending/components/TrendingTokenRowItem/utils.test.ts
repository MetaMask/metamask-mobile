import { formatCompactUSD, formatMarketStats } from './utils';

describe('formatCompactUSD', () => {
  describe('Billions formatting', () => {
    it('formats billions with B suffix and no decimals', () => {
      const value = 13000000000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$13B');
    });

    it('formats large billions correctly', () => {
      const value = 999999999999;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1000B');
    });

    it('formats billions with rounding', () => {
      const value = 2500000000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$3B');
    });
  });

  describe('Millions formatting', () => {
    it('formats millions with M suffix and one decimal', () => {
      const value = 34200000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$34.2M');
    });

    it('formats millions with rounding', () => {
      const value = 974248822.2;

      const result = formatCompactUSD(value);

      expect(result).toBe('$974.2M');
    });

    it('formats large millions correctly', () => {
      const value = 999999999;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1000.0M');
    });
  });

  describe('Thousands formatting', () => {
    it('formats thousands with K suffix and one decimal', () => {
      const value = 850500;

      const result = formatCompactUSD(value);

      expect(result).toBe('$850.5K');
    });

    it('formats thousands with rounding', () => {
      const value = 123456;

      const result = formatCompactUSD(value);

      expect(result).toBe('$123.5K');
    });

    it('formats large thousands correctly', () => {
      const value = 999999;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1000.0K');
    });
  });

  describe('Small values formatting', () => {
    it('formats values less than 1000 with two decimals', () => {
      const value = 532.5;

      const result = formatCompactUSD(value);

      expect(result).toBe('$532.50');
    });

    it('formats small decimal values correctly', () => {
      const value = 123.45;

      const result = formatCompactUSD(value);

      expect(result).toBe('$123.45');
    });

    it('formats very small values correctly', () => {
      const value = 0.01;

      const result = formatCompactUSD(value);

      expect(result).toBe('$0.01');
    });
  });

  describe('Zero and edge cases', () => {
    it('formats zero correctly', () => {
      const value = 0;

      const result = formatCompactUSD(value);

      expect(result).toBe('$0.00');
    });

    it('formats exactly 1000 correctly', () => {
      const value = 1000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1.0K');
    });

    it('formats exactly 1000000 correctly', () => {
      const value = 1000000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1.0M');
    });

    it('formats exactly 1000000000 correctly', () => {
      const value = 1000000000;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1B');
    });
  });
  describe('Invalid inputs', () => {
    it('returns Invalid number for NaN', () => {
      const value = NaN;

      const result = formatCompactUSD(value);

      expect(result).toBe('Invalid number');
    });

    it('returns Invalid number for string that converts to NaN', () => {
      const value = Number('invalid');

      const result = formatCompactUSD(value);

      expect(result).toBe('Invalid number');
    });
  });

  describe('Boundary conditions', () => {
    it('formats value just below 1000', () => {
      const value = 999.99;

      const result = formatCompactUSD(value);

      expect(result).toBe('$999.99');
    });

    it('formats value just above 1000', () => {
      const value = 1000.01;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1.0K');
    });

    it('formats value just below 1000000', () => {
      const value = 999999.99;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1000.0K');
    });

    it('formats value just above 1000000', () => {
      const value = 1000000.01;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1.0M');
    });

    it('formats value just below 1000000000', () => {
      const value = 999999999.99;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1000.0M');
    });

    it('formats value just above 1000000000', () => {
      const value = 1000000000.01;

      const result = formatCompactUSD(value);

      expect(result).toBe('$1B');
    });
  });
});

describe('formatMarketStats', () => {
  describe('Combined formatting', () => {
    it('formats market cap and volume with correct format', () => {
      const marketCap = 75641301011.76;
      const volume = 974248822.2;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$76B cap • $974.2M vol');
    });

    it('formats both values as billions', () => {
      const marketCap = 13000000000;
      const volume = 5000000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$13B cap • $5B vol');
    });

    it('formats both values as millions', () => {
      const marketCap = 34200000;
      const volume = 15000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$34.2M cap • $15.0M vol');
    });

    it('formats both values as thousands', () => {
      const marketCap = 850500;
      const volume = 123400;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$850.5K cap • $123.4K vol');
    });

    it('formats both values as small numbers', () => {
      const marketCap = 532.5;
      const volume = 123.45;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$532.50 cap • $123.45 vol');
    });
  });

  describe('Mixed value ranges', () => {
    it('formats billion market cap with million volume', () => {
      const marketCap = 13000000000;
      const volume = 50000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$13B cap • $50.0M vol');
    });

    it('formats million market cap with thousand volume', () => {
      const marketCap = 5000000;
      const volume = 123400;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$5.0M cap • $123.4K vol');
    });

    it('formats thousand market cap with small volume', () => {
      const marketCap = 5000;
      const volume = 123.45;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$5.0K cap • $123.45 vol');
    });
  });

  describe('Zero values', () => {
    it('formats zero market cap and volume as dashes', () => {
      const marketCap = 0;
      const volume = 0;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('- cap • - vol');
    });

    it('formats zero market cap with non-zero volume', () => {
      const marketCap = 0;
      const volume = 1000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('- cap • $1.0M vol');
    });

    it('formats non-zero market cap with zero volume', () => {
      const marketCap = 1000000;
      const volume = 0;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$1.0M cap • - vol');
    });
  });

  describe('Invalid inputs', () => {
    it('handles NaN market cap', () => {
      const marketCap = NaN;
      const volume = 1000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('Invalid number cap • $1.0M vol');
    });

    it('handles NaN volume', () => {
      const marketCap = 1000000;
      const volume = NaN;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$1.0M cap • Invalid number vol');
    });

    it('handles both NaN values', () => {
      const marketCap = NaN;
      const volume = NaN;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('Invalid number cap • Invalid number vol');
    });
  });

  describe('Very large values', () => {
    it('formats very large market cap and volume', () => {
      const marketCap = 999999999999;
      const volume = 500000000000;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$1000B cap • $500B vol');
    });
  });

  describe('Very small values', () => {
    it('formats very small market cap and volume', () => {
      const marketCap = 0.01;
      const volume = 0.005;

      const result = formatMarketStats(marketCap, volume);

      expect(result).toBe('$0.01 cap • $0.01 vol');
    });
  });
});
