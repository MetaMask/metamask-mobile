import { PERPS_AGGREGATE_FILLS } from '../../../../constants/storage';
import StorageWrapper from '../../../../store/storage-wrapper';
import {
  getPerpsAggregateFillsPreference,
  setPerpsAggregateFillsPreference,
} from './perpsFillDisplayStorage';

jest.mock('../../../../store/storage-wrapper', () => ({
  getItemSync: jest.fn(),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockStorage = StorageWrapper as jest.Mocked<typeof StorageWrapper>;

describe('perpsFillDisplayStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStorage.setItem.mockResolvedValue(undefined);
  });

  describe('getPerpsAggregateFillsPreference', () => {
    it('defaults to aggregated when nothing was saved', () => {
      mockStorage.getItemSync.mockReturnValue(null);

      expect(getPerpsAggregateFillsPreference()).toBe(true);
      expect(mockStorage.getItemSync).toHaveBeenCalledWith(
        PERPS_AGGREGATE_FILLS,
      );
    });

    it('returns false when individual fills were saved', () => {
      mockStorage.getItemSync.mockReturnValue('false');

      expect(getPerpsAggregateFillsPreference()).toBe(false);
    });

    it('returns true when aggregated was saved', () => {
      mockStorage.getItemSync.mockReturnValue('true');

      expect(getPerpsAggregateFillsPreference()).toBe(true);
    });
  });

  describe('setPerpsAggregateFillsPreference', () => {
    it.each([
      [false, 'false'],
      [true, 'true'],
    ])('writes %s as %s', (aggregateFills, stored) => {
      setPerpsAggregateFillsPreference(aggregateFills);

      expect(mockStorage.setItem).toHaveBeenCalledWith(
        PERPS_AGGREGATE_FILLS,
        stored,
      );
    });

    it('swallows a rejected write', async () => {
      mockStorage.setItem.mockRejectedValue(new Error('mmkv unavailable'));

      expect(() => setPerpsAggregateFillsPreference(false)).not.toThrow();
      await Promise.resolve();
    });

    it('swallows a synchronous throw', () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('mmkv unavailable');
      });

      expect(() => setPerpsAggregateFillsPreference(false)).not.toThrow();
    });
  });
});
