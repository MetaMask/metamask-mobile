import Clipboard from '@react-native-clipboard/clipboard';
import Device from '../util/device';
import Logger from '../util/Logger';
import ClipboardManager from './ClipboardManager';

// Mock dependencies
jest.mock('@react-native-clipboard/clipboard', () => ({
  getString: jest.fn(),
  setString: jest.fn(),
  setStringExpire: jest.fn(),
  clearString: jest.fn(),
}));
jest.mock('../util/device');
jest.mock('../util/Logger');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClipboard = Clipboard as any;
const mockDevice = jest.mocked(Device);
const mockLogger = jest.mocked(Logger);

describe('ClipboardManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    ClipboardManager.expireTime = null;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Basic clipboard operations', () => {
    it('get and set clipboard strings', async () => {
      // Arrange
      const testString = 'test clipboard content';
      mockClipboard.getString.mockResolvedValue(testString);
      mockClipboard.setString.mockResolvedValue();

      // Act
      const getResult = await ClipboardManager.getString();
      await ClipboardManager.setString(testString);

      // Assert
      expect(getResult).toBe(testString);
      expect(mockClipboard.getString).toHaveBeenCalledTimes(1);
      expect(mockClipboard.setString).toHaveBeenCalledWith(testString);
    });
  });

  describe('iOS platform behavior', () => {
    beforeEach(() => {
      mockDevice.isIos.mockReturnValue(true);
    });

    it('use setStringExpire on iOS with fallback', async () => {
      // Arrange
      const testString = 'test string with expiry';
      const error = new Error('setStringExpire not supported');
      mockClipboard.setStringExpire.mockRejectedValue(error);
      mockClipboard.setString.mockResolvedValue();

      // Act
      await ClipboardManager.setStringExpire(testString);

      // Assert
      expect(mockClipboard.setStringExpire).toHaveBeenCalledWith(testString);
      expect(mockClipboard.setString).toHaveBeenCalledWith(testString);
      expect(mockLogger.error).toHaveBeenCalledWith(
        error,
        'setStringExpire failed, falling back to setString',
      );
    });
  });

  describe('Android platform behavior', () => {
    beforeEach(() => {
      mockDevice.isIos.mockReturnValue(false);
    });

    it('set string and schedule expiration timeout on Android', async () => {
      // Arrange
      const testString = 'test string with expiry';
      mockClipboard.setString.mockResolvedValue();

      // Act
      await ClipboardManager.setStringExpire(testString);

      // Assert
      expect(mockClipboard.setString).toHaveBeenCalledWith(testString);
      expect(ClipboardManager.expireTime).toBeDefined();
      expect(mockClipboard.setStringExpire).not.toHaveBeenCalled();
    });
  });

  describe('Error handling', () => {
    it('handle clipboard errors gracefully', async () => {
      // Arrange
      const testString = 'test string';
      const getStringError = new Error('Clipboard access denied');
      const setStringError = new Error('Clipboard write failed');
      mockClipboard.getString.mockRejectedValue(getStringError);
      mockClipboard.setString.mockRejectedValue(setStringError);

      // Act & Assert
      await expect(ClipboardManager.getString()).rejects.toThrow(
        'Clipboard access denied',
      );
      await expect(ClipboardManager.setString(testString)).rejects.toThrow(
        'Clipboard write failed',
      );
    });
  });
});
