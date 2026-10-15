import {
  mockAutoClose,
  mockCopyCount,
  mockMarkPrice,
} from './socialV1Enrichment';

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

  describe('mockAutoClose', () => {
    it('returns the same pair for the same trader and symbol', () => {
      expect(mockAutoClose('profile-1', 'BTC', ENTRY_PRICE, 'long')).toEqual(
        mockAutoClose('profile-1', 'BTC', ENTRY_PRICE, 'long'),
      );
    });

    it('brackets a long with take-profit above and stop-loss below entry', () => {
      const pair = mockAutoClose('profile-1', 'BTC', ENTRY_PRICE, 'long');

      expect(pair?.takeProfit).toBeGreaterThan(ENTRY_PRICE);
      expect(pair?.stopLoss).toBeLessThan(ENTRY_PRICE);
    });

    // A short profits as the price falls, so the pair has to invert.
    it('brackets a short with take-profit below and stop-loss above entry', () => {
      const pair = mockAutoClose('profile-1', 'BTC', ENTRY_PRICE, 'short');

      expect(pair?.takeProfit).toBeLessThan(ENTRY_PRICE);
      expect(pair?.stopLoss).toBeGreaterThan(ENTRY_PRICE);
    });

    it('returns null without an entry price to bracket', () => {
      expect(mockAutoClose('profile-1', 'BTC', null, 'long')).toBeNull();
    });
  });

  describe('mockCopyCount', () => {
    // A count that moved on re-render would read as live activity that isn't.
    it('returns the same count for the same post', () => {
      expect(mockCopyCount('post-1')).toBe(mockCopyCount('post-1'));
    });

    it('returns a non-negative whole number', () => {
      const count = mockCopyCount('post-1');

      expect(Number.isInteger(count)).toBe(true);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('spreads counts across posts', () => {
      const counts = new Set(
        Array.from({ length: 40 }, (_, index) =>
          mockCopyCount(`post-${index}`),
        ),
      );

      expect(counts.size).toBeGreaterThan(1);
    });
  });
});
