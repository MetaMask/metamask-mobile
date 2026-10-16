import { mockMarkPrice } from './socialV1Enrichment';

const ENTRY_PRICE = 50_000;

describe('socialV1Enrichment', () => {
  describe('mockMarkPrice', () => {
    it('returns the same mark for the same trader and symbol', () => {
      expect(mockMarkPrice('profile-1', 'BTC', ENTRY_PRICE)).toBe(
        mockMarkPrice('profile-1', 'BTC', ENTRY_PRICE),
      );
    });

    it('stays within a plausible distance of the entry price', () => {
      const mark = mockMarkPrice('profile-1', 'BTC', ENTRY_PRICE);

      expect(mark).not.toBeNull();
      expect(
        Math.abs((mark as number) - ENTRY_PRICE) / ENTRY_PRICE,
      ).toBeLessThan(0.1);
    });

    it('returns null without an entry price to offset from', () => {
      expect(mockMarkPrice('profile-1', 'BTC', null)).toBeNull();
      expect(mockMarkPrice('profile-1', 'BTC', 0)).toBeNull();
    });
  });
});
