import StorageWrapper from '../../../../store/storage-wrapper';
import { PERPS_MODE_SELECTION_COMPLETED } from '../../../../constants/storage';
import {
  hasCompletedPerpsModeSelection,
  markPerpsModeSelectionCompleted,
} from './perpsModeSelectionStorage';

jest.mock('../../../../store/storage-wrapper', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
}));

describe('perpsModeSelectionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasCompletedPerpsModeSelection', () => {
    it('returns false when the storage key is unset', async () => {
      jest.mocked(StorageWrapper.getItem).mockResolvedValue(null);

      await expect(hasCompletedPerpsModeSelection()).resolves.toBe(false);
      expect(StorageWrapper.getItem).toHaveBeenCalledWith(
        PERPS_MODE_SELECTION_COMPLETED,
      );
    });

    it('returns true when the storage key is "true"', async () => {
      jest.mocked(StorageWrapper.getItem).mockResolvedValue('true');

      await expect(hasCompletedPerpsModeSelection()).resolves.toBe(true);
    });
  });

  describe('markPerpsModeSelectionCompleted', () => {
    it('persists the completed flag', async () => {
      await markPerpsModeSelectionCompleted();

      expect(StorageWrapper.setItem).toHaveBeenCalledWith(
        PERPS_MODE_SELECTION_COMPLETED,
        'true',
      );
    });
  });
});
