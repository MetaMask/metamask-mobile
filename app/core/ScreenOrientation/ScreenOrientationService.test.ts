import { ScreenOrientationService } from './ScreenOrientationService';
import {
  lockAsync,
  unlockAsync,
  OrientationLock,
} from 'expo-screen-orientation';

jest.mock('expo-screen-orientation');
jest.mock('../../util/Logger');

const mockLockAsync = lockAsync as jest.MockedFunction<typeof lockAsync>;
const mockUnlockAsync = unlockAsync as jest.MockedFunction<typeof unlockAsync>;

describe('ScreenOrientationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLockAsync.mockResolvedValue(undefined);
    mockUnlockAsync.mockResolvedValue(undefined);
  });

  describe('lockToPortrait', () => {
    it('calls lockAsync with PORTRAIT_UP', async () => {
      await ScreenOrientationService.lockToPortrait();

      expect(mockLockAsync).toHaveBeenCalledWith(OrientationLock.PORTRAIT_UP);
    });

    it('sets isLocked to true after successful lock', async () => {
      await ScreenOrientationService.lockToPortrait();

      expect(ScreenOrientationService.isLockedToPortrait()).toBe(true);
    });

    it('handles lock errors gracefully', async () => {
      mockLockAsync.mockRejectedValueOnce(new Error('Lock failed'));

      await expect(
        ScreenOrientationService.lockToPortrait(),
      ).resolves.not.toThrow();
    });
  });

  describe('allowLandscape', () => {
    it('calls unlockAsync', async () => {
      await ScreenOrientationService.allowLandscape();

      expect(mockUnlockAsync).toHaveBeenCalled();
    });

    it('sets isLocked to false after successful unlock', async () => {
      await ScreenOrientationService.lockToPortrait();
      await ScreenOrientationService.allowLandscape();

      expect(ScreenOrientationService.isLockedToPortrait()).toBe(false);
    });

    it('handles unlock errors gracefully', async () => {
      mockUnlockAsync.mockRejectedValueOnce(new Error('Unlock failed'));

      await expect(
        ScreenOrientationService.allowLandscape(),
      ).resolves.not.toThrow();
    });
  });

  describe('isLockedToPortrait', () => {
    it('returns false initially', async () => {
      // Reset state by allowing landscape first
      await ScreenOrientationService.allowLandscape();

      expect(ScreenOrientationService.isLockedToPortrait()).toBe(false);
    });

    it('returns true after locking to portrait', async () => {
      await ScreenOrientationService.lockToPortrait();

      expect(ScreenOrientationService.isLockedToPortrait()).toBe(true);
    });

    it('returns false after allowing landscape', async () => {
      await ScreenOrientationService.lockToPortrait();
      await ScreenOrientationService.allowLandscape();

      expect(ScreenOrientationService.isLockedToPortrait()).toBe(false);
    });
  });
});
