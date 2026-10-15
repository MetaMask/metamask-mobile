import StorageWrapper from '../../store/storage-wrapper';
import {
  getSocialLastTradeStorageKey,
  hasRecentSocialTrade,
  isRecentSocialActivityTimestamp,
  isSocialTradeSource,
  recordSocialTrade,
  SOCIAL_RECENT_ACTIVITY_WINDOW_MS,
} from './socialActivityStorage';

jest.mock('../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockStorage = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
const NOW = 1_760_000_000_000;
const WALLET_ADDRESS = '0x1234567890123456789012345678901234567890';
const OTHER_WALLET_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

describe('socialActivityStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  describe('isSocialTradeSource', () => {
    it('returns true for Quick Buy social sources', () => {
      expect(isSocialTradeSource('profile_position')).toBe(true);
      expect(isSocialTradeSource('trader_feed')).toBe(true);
    });

    it('returns true for Bridge social sources', () => {
      expect(isSocialTradeSource('Follow Trading Token Screen')).toBe(true);
      expect(isSocialTradeSource('Follow Trading Feed Screen')).toBe(true);
    });

    it('returns false for non-social sources', () => {
      expect(isSocialTradeSource('asset_details')).toBe(false);
      expect(isSocialTradeSource()).toBe(false);
    });
  });

  describe('recordSocialTrade', () => {
    it('writes the supplied timestamp as a string', () => {
      recordSocialTrade(WALLET_ADDRESS, NOW);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        getSocialLastTradeStorageKey(WALLET_ADDRESS),
        String(NOW),
      );
    });

    it('does not write when no wallet is selected', () => {
      recordSocialTrade('');

      expect(mockStorage.setItem).not.toHaveBeenCalled();
    });

    it('swallows storage failures', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('storage unavailable'));

      expect(() => recordSocialTrade(WALLET_ADDRESS, NOW)).not.toThrow();

      await Promise.resolve();
    });
  });

  describe('hasRecentSocialTrade', () => {
    it('returns false when no trade was recorded', () => {
      mockStorage.getItemSync.mockReturnValue(null);

      expect(hasRecentSocialTrade(WALLET_ADDRESS, NOW)).toBe(false);
    });

    it('returns true for a trade inside the recency window', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW - 1000));

      expect(hasRecentSocialTrade(WALLET_ADDRESS, NOW)).toBe(true);
    });

    it('returns false after the recency window', () => {
      mockStorage.getItemSync.mockReturnValue(
        String(NOW - SOCIAL_RECENT_ACTIVITY_WINDOW_MS),
      );

      expect(hasRecentSocialTrade(WALLET_ADDRESS, NOW)).toBe(false);
    });

    it('returns false for a future timestamp', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW + 60_000));

      expect(hasRecentSocialTrade(WALLET_ADDRESS, NOW)).toBe(false);
    });

    it.each([['not-a-number'], [''], ['0'], ['-1']])(
      'returns false for the unusable stored value %p',
      (stored) => {
        mockStorage.getItemSync.mockReturnValue(stored);

        expect(hasRecentSocialTrade(WALLET_ADDRESS, NOW)).toBe(false);
      },
    );

    it('reads the timestamp synchronously', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW - 1000));

      hasRecentSocialTrade(WALLET_ADDRESS, NOW);

      expect(mockStorage.getItemSync).toHaveBeenCalledWith(
        getSocialLastTradeStorageKey(WALLET_ADDRESS),
      );
    });

    it('returns false when no wallet is selected', () => {
      expect(hasRecentSocialTrade(undefined, NOW)).toBe(false);

      expect(mockStorage.getItemSync).not.toHaveBeenCalled();
    });

    it('does not reuse another wallet timestamp', () => {
      mockStorage.getItemSync.mockImplementation((key) =>
        key === getSocialLastTradeStorageKey(WALLET_ADDRESS)
          ? String(NOW - 1000)
          : null,
      );

      expect(hasRecentSocialTrade(OTHER_WALLET_ADDRESS, NOW)).toBe(false);
    });
  });

  describe('isRecentSocialActivityTimestamp', () => {
    it('accepts an ISO timestamp inside the recency window', () => {
      expect(
        isRecentSocialActivityTimestamp(
          new Date(NOW - 1000).toISOString(),
          NOW,
        ),
      ).toBe(true);
    });

    it('rejects timestamps at or beyond the recency boundary', () => {
      expect(
        isRecentSocialActivityTimestamp(
          new Date(NOW - SOCIAL_RECENT_ACTIVITY_WINDOW_MS).toISOString(),
          NOW,
        ),
      ).toBe(false);
    });

    it.each(['not-a-date', '', null, undefined])(
      'rejects an unusable timestamp %p',
      (timestamp) => {
        expect(isRecentSocialActivityTimestamp(timestamp, NOW)).toBe(false);
      },
    );
  });
});
