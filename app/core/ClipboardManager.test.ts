import Clipboard from '@react-native-clipboard/clipboard';
import Device from '../util/device';
import ClipboardManager from './ClipboardManager';

jest.mock('../util/device');
jest.mock('@react-native-clipboard/clipboard');

describe('ClipboardManager', () => {
  let clearTimeoutSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.spyOn(global, 'setTimeout');
    clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

    // Set up Clipboard mock implementation
    (Clipboard.getString as jest.Mock) = jest.fn().mockResolvedValue('');
    (Clipboard.setString as jest.Mock) = jest.fn().mockResolvedValue(undefined);
    (Clipboard.setStringExpire as jest.Mock) = jest
      .fn()
      .mockResolvedValue(undefined);
    (Clipboard.clearString as jest.Mock) = jest
      .fn()
      .mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('getString', () => {
    it('should call Clipboard.getString', async () => {
      const mockString = 'test string';
      (Clipboard.getString as jest.Mock).mockResolvedValue(mockString);

      const result = await ClipboardManager.getString();

      expect(Clipboard.getString).toHaveBeenCalled();
      expect(result).toBe(mockString);
    });
  });

  describe('setString', () => {
    it('should call Clipboard.setString with the provided string', async () => {
      const testString = 'test string';
      const setStringMock = Clipboard.setString as jest.Mock;

      await ClipboardManager.setString(testString);

      expect(setStringMock).toHaveBeenCalledWith(testString);
    });
  });

  describe('setStringExpire', () => {
    it('should call Clipboard.setStringExpire on iOS', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(true);
      const testString = 'test string';

      await ClipboardManager.setStringExpire(testString);

      expect(Clipboard.setStringExpire).toHaveBeenCalledWith(testString);
    });

    it('should set string and clear after timeout on non-iOS', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      const testString = 'test string';

      await ClipboardManager.setStringExpire(testString);

      expect(Clipboard.setString).toHaveBeenCalledWith(testString);
      expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), 60000);

      // Simulate the passage of time
      (Clipboard.getString as jest.Mock).mockResolvedValueOnce(testString);
      jest.advanceTimersByTime(60000);

      // Wait for all pending timers and microtasks to complete
      await jest.runAllTimersAsync();

      // Check if the callback function was executed
      expect(Clipboard.getString).toHaveBeenCalled();
      expect(Clipboard.clearString).toHaveBeenCalled();
    });

    it('should clear previous timeout on consecutive calls on non-iOS', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      const testString1 = 'test string 1';
      const testString2 = 'test string 2';
      const setStringSpy = jest.spyOn(Clipboard, 'setString');

      await ClipboardManager.setStringExpire(testString1);
      await ClipboardManager.setStringExpire(testString2);

      expect(clearTimeoutSpy).toHaveBeenCalled();
      expect(setStringSpy).toHaveBeenCalledWith(testString2);

      expect(setTimeout).toHaveBeenCalledTimes(2);
      expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 60000);
    });

    it('should not clear clipboard if getString returns empty on non-iOS', async () => {
      (Device.isIos as jest.Mock).mockReturnValue(false);
      const testString = 'test string';
      jest.spyOn(Clipboard, 'getString').mockResolvedValue('');
      const clearStringSpy = jest.spyOn(Clipboard, 'clearString');

      await ClipboardManager.setStringExpire(testString);
      jest.advanceTimersByTime(60000);

      expect(Clipboard.getString).toHaveBeenCalled();
      expect(clearStringSpy).not.toHaveBeenCalled();
    });
  });

  describe('clearString', () => {
    it('should call Clipboard.clearString if getString returns non-empty', async () => {
      (Clipboard.getString as jest.Mock).mockResolvedValue('test string');
      await ClipboardManager.clearString();

      expect(Clipboard.getString).toHaveBeenCalled();
      expect(Clipboard.clearString).toHaveBeenCalled();
    });

    it('should not call Clipboard.clearString if getString returns empty', async () => {
      (Clipboard.getString as jest.Mock).mockResolvedValue('');
      await ClipboardManager.clearString();

      expect(Clipboard.getString).toHaveBeenCalled();
      expect(Clipboard.clearString).not.toHaveBeenCalled();
    });
  });
});
