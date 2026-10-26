import { PERPS_ORDER_BOOK_SIZE_ON_CLICK } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  getPerpsOrderBookSizeOnClickPreference,
  setPerpsOrderBookSizeOnClickPreference,
} from './perpsOrderBookSizeOnClickStorage';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockStorage = StorageWrapper as jest.Mocked<typeof StorageWrapper>;

describe('perpsOrderBookSizeOnClickStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  describe('getPerpsOrderBookSizeOnClickPreference', () => {
    it('defaults to off when nothing was saved', () => {
      mockStorage.getItemSync.mockReturnValue(null);

      expect(getPerpsOrderBookSizeOnClickPreference()).toBe(false);
      expect(mockStorage.getItemSync).toHaveBeenCalledWith(
        PERPS_ORDER_BOOK_SIZE_ON_CLICK,
      );
    });

    it('returns true when on was saved', () => {
      mockStorage.getItemSync.mockReturnValue('true');

      expect(getPerpsOrderBookSizeOnClickPreference()).toBe(true);
    });

    it('returns false when off was saved', () => {
      mockStorage.getItemSync.mockReturnValue('false');

      expect(getPerpsOrderBookSizeOnClickPreference()).toBe(false);
    });
  });

  describe('setPerpsOrderBookSizeOnClickPreference', () => {
    it.each([
      [true, 'true'],
      [false, 'false'],
    ])('writes %s as %s', (sizeOnClick, stored) => {
      setPerpsOrderBookSizeOnClickPreference(sizeOnClick);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        PERPS_ORDER_BOOK_SIZE_ON_CLICK,
        stored,
      );
    });

    it('swallows a rejected write', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('mmkv unavailable'));

      expect(() => setPerpsOrderBookSizeOnClickPreference(true)).not.toThrow();
      await Promise.resolve();
    });
  });
});
