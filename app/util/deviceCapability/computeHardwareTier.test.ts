import { computeHardwareTier } from './computeHardwareTier';

const GIB = 1024 ** 3;

describe('computeHardwareTier', () => {
  describe('ios', () => {
    it('returns LOW at 2 GiB inclusive', () => {
      const result = computeHardwareTier('ios', 2 * GIB);

      expect(result).toBe('LOW');
    });

    it('returns MID one byte above 2 GiB', () => {
      const result = computeHardwareTier('ios', 2 * GIB + 1);

      expect(result).toBe('MID');
    });

    it('returns MID at 4 GiB inclusive', () => {
      const result = computeHardwareTier('ios', 4 * GIB);

      expect(result).toBe('MID');
    });

    it('returns HIGH one byte above 4 GiB', () => {
      const result = computeHardwareTier('ios', 4 * GIB + 1);

      expect(result).toBe('HIGH');
    });

    it('returns null for null memory', () => {
      const result = computeHardwareTier('ios', null);

      expect(result).toBeNull();
    });

    it('returns null for zero memory', () => {
      const result = computeHardwareTier('ios', 0);

      expect(result).toBeNull();
    });

    it('returns null for NaN memory', () => {
      const result = computeHardwareTier('ios', Number.NaN);

      expect(result).toBeNull();
    });
  });

  describe('android', () => {
    it('returns LOW one byte below 3 GiB', () => {
      const result = computeHardwareTier('android', 3 * GIB - 1);

      expect(result).toBe('LOW');
    });

    it('returns MID at 3 GiB inclusive', () => {
      const result = computeHardwareTier('android', 3 * GIB);

      expect(result).toBe('MID');
    });

    it('returns MID one byte below 5 GiB', () => {
      const result = computeHardwareTier('android', 5 * GIB - 1);

      expect(result).toBe('MID');
    });

    it('returns HIGH at 5 GiB inclusive', () => {
      const result = computeHardwareTier('android', 5 * GIB);

      expect(result).toBe('HIGH');
    });

    it('returns null for null memory', () => {
      const result = computeHardwareTier('android', null);

      expect(result).toBeNull();
    });

    it('returns null for zero memory', () => {
      const result = computeHardwareTier('android', 0);

      expect(result).toBeNull();
    });

    it('returns null for NaN memory', () => {
      const result = computeHardwareTier('android', Number.NaN);

      expect(result).toBeNull();
    });
  });
});
