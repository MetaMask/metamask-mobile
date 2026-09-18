import { PERPS_LAST_ACTION_AT } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  PERPS_RECENT_ACTION_WINDOW_MS,
  hasRecentPerpsAction,
  recordPerpsAction,
} from './perpsActivityStorage';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockStorage = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
const NOW = 1_760_000_000_000;

describe('perpsActivityStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  describe('recordPerpsAction', () => {
    it('writes the supplied timestamp as a string', () => {
      recordPerpsAction(NOW);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        PERPS_LAST_ACTION_AT,
        String(NOW),
      );
    });

    it('swallows a rejected write so order execution is unaffected', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('mmkv unavailable'));

      expect(() => recordPerpsAction(NOW)).not.toThrow();
      await Promise.resolve();
    });

    it('swallows a synchronous throw so a failed write cannot abort a trade', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('mmkv unavailable');
      });

      expect(() => recordPerpsAction(NOW)).not.toThrow();
    });
  });

  describe('hasRecentPerpsAction', () => {
    it('returns false when nothing was ever recorded', () => {
      mockStorage.getItemSync.mockReturnValue(null);

      expect(hasRecentPerpsAction(NOW)).toBe(false);
    });

    it('returns true for an action inside the window', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW - 1000));

      expect(hasRecentPerpsAction(NOW)).toBe(true);
    });

    it('returns true at the moment of the action', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW));

      expect(hasRecentPerpsAction(NOW)).toBe(true);
    });

    it('returns false once the window has elapsed', () => {
      mockStorage.getItemSync.mockReturnValue(
        String(NOW - PERPS_RECENT_ACTION_WINDOW_MS),
      );

      expect(hasRecentPerpsAction(NOW)).toBe(false);
    });

    it('returns true just inside the window boundary', () => {
      mockStorage.getItemSync.mockReturnValue(
        String(NOW - PERPS_RECENT_ACTION_WINDOW_MS + 1),
      );

      expect(hasRecentPerpsAction(NOW)).toBe(true);
    });

    it('returns false for a future timestamp so a backwards clock cannot grant an open-ended window', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW + 60_000));

      expect(hasRecentPerpsAction(NOW)).toBe(false);
    });

    it.each([['not-a-number'], [''], ['0'], ['-1']])(
      'returns false for the unusable stored value %p',
      (stored) => {
        mockStorage.getItemSync.mockReturnValue(stored);

        expect(hasRecentPerpsAction(NOW)).toBe(false);
      },
    );

    it('reads synchronously so section order can be decided during render', () => {
      mockStorage.getItemSync.mockReturnValue(String(NOW - 1000));

      hasRecentPerpsAction(NOW);

      expect(mockStorage.getItemSync).toHaveBeenCalledWith(
        PERPS_LAST_ACTION_AT,
      );
    });
  });
});
