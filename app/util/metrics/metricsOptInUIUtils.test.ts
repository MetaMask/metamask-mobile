import StorageWrapper from '../../store/storage-wrapper';
import Logger from '../Logger';
import { OPTIN_META_METRICS_UI_SEEN, TRUE } from '../../constants/storage';
import {
  markMetricsOptInUISeen,
  resetMetricsOptInUISeen,
} from './metricsOptInUIUtils';

jest.mock('../../store/storage-wrapper', () => ({
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../Logger');

describe('metricsOptInUIUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markMetricsOptInUISeen', () => {
    it('sets the storage item and returns true on success', async () => {
      // Arrange
      const setItemMock = jest.mocked(StorageWrapper.setItem);
      setItemMock.mockResolvedValueOnce(undefined);

      // Act
      const result = await markMetricsOptInUISeen();

      // Assert
      expect(setItemMock).toHaveBeenCalledWith(
        OPTIN_META_METRICS_UI_SEEN,
        TRUE,
      );
      expect(result).toBe(true);
    });

    it('logs error and returns false when storage operation fails', async () => {
      // Arrange
      const setItemMock = jest.mocked(StorageWrapper.setItem);
      const testError = new Error('Storage write failed');
      setItemMock.mockRejectedValueOnce(testError);

      // Act
      const result = await markMetricsOptInUISeen();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        'Failed to mark metrics opt-in UI as seen',
      );
      expect(result).toBe(false);
    });
  });

  describe('resetMetricsOptInUISeen', () => {
    it('removes the storage item and returns true on success', async () => {
      // Arrange
      const removeItemMock = jest.mocked(StorageWrapper.removeItem);
      removeItemMock.mockResolvedValueOnce(undefined);

      // Act
      const result = await resetMetricsOptInUISeen();

      // Assert
      expect(removeItemMock).toHaveBeenCalledWith(OPTIN_META_METRICS_UI_SEEN);
      expect(result).toBe(true);
    });

    it('logs error and returns false when storage operation fails', async () => {
      // Arrange
      const removeItemMock = jest.mocked(StorageWrapper.removeItem);
      const testError = new Error('Storage remove failed');
      removeItemMock.mockRejectedValueOnce(testError);

      // Act
      const result = await resetMetricsOptInUISeen();

      // Assert
      expect(Logger.error).toHaveBeenCalledWith(
        testError,
        'Failed to reset metrics opt-in UI seen flag',
      );
      expect(result).toBe(false);
    });
  });
});
