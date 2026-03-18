import { selectAccountMenuEnabled } from '.';

describe('Account Menu Feature Flag Selectors', () => {
  describe('selectAccountMenuEnabled', () => {
    it('returns true when remote flag payload is empty', () => {
      const result = selectAccountMenuEnabled.resultFunc({});
      expect(result).toBe(true);
    });

    it('returns true when remote flag payload includes legacy-shaped values', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        legacyFlag: {
          enabled: false,
          minimumVersion: '999.0.0',
        },
      });
      expect(result).toBe(true);
    });

    it('returns true when remote flag payload includes arbitrary values', () => {
      const result = selectAccountMenuEnabled.resultFunc({
        someOtherFlag: false,
      });
      expect(result).toBe(true);
    });
  });
});
