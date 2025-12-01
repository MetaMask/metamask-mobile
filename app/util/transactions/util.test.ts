import { stripSingleLeadingZero } from './util';

describe('Transaction Utils', () => {
  describe('stripSingleLeadingZero', () => {
    it('returns the same hex if it does not start with 0x0', () => {
      expect(stripSingleLeadingZero('0x1a2b3c')).toBe('0x1a2b3c');
    });

    it('strips a single leading zero from the hex', () => {
      expect(stripSingleLeadingZero('0x0123')).toBe('0x123');
      expect(stripSingleLeadingZero('0x0abcdef')).toBe('0xabcdef');
      expect(stripSingleLeadingZero('0x0001')).toBe('0x001');
    });
  });
});
