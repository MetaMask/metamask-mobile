import {
  mockAutoClose,
  mockComment,
  mockMarkPrice,
  mockWinRatePercent,
} from './socialV1Enrichment';

const ENTRY_PRICE = 50_000;

describe('socialV1Enrichment', () => {
  describe('mockWinRatePercent', () => {
    it('returns the same win rate for the same trader', () => {
      expect(mockWinRatePercent('profile-1')).toBe(
        mockWinRatePercent('profile-1'),
      );
    });

    it('returns a whole percent inside 0-100', () => {
      const winRate = mockWinRatePercent('profile-1');

      expect(Number.isInteger(winRate)).toBe(true);
      expect(winRate).toBeGreaterThan(0);
      expect(winRate).toBeLessThanOrEqual(100);
    });

    // A feed where everyone is elite would make the leaderboard's 90%+ trophy
    // highlight meaningless.
    it('keeps elite win rates rare across many traders', () => {
      const winRates = Array.from({ length: 100 }, (_, index) =>
        mockWinRatePercent(`profile-${index}`),
      );

      const elite = winRates.filter((rate) => rate >= 90);

      expect(elite.length).toBeLessThan(winRates.length / 2);
    });
  });

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

  describe('mockComment', () => {
    it('returns the same caption for the same trader and position', () => {
      const captions = Array.from({ length: 40 }, (_, index) =>
        mockComment('profile-1', `pos-${index}`),
      );
      const captionedIndex = captions.findIndex((caption) => caption !== null);

      expect(mockComment('profile-1', `pos-${captionedIndex}`)).toBe(
        captions[captionedIndex],
      );
    });

    it('captions only a minority of positions', () => {
      const captions = Array.from({ length: 100 }, (_, index) =>
        mockComment('profile-1', `pos-${index}`),
      );

      const captioned = captions.filter((caption) => caption !== null);

      expect(captioned.length).toBeGreaterThan(0);
      expect(captioned.length).toBeLessThan(captions.length / 2);
    });
  });
});
