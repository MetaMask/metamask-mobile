/* eslint-env jest */
import Utilities from './framework/Utilities';
import { setDeviceInfo } from './framework/DeviceInfoCache';

/**
 * Before all tests, modify the app launch arguments to include the blacklistURLs.
 * This sets up the environment for Detox tests.
 */
beforeAll(async () => {
  device.appLaunchArgs.modify({
    detoxURLBlacklistRegex: Utilities.BlacklistURLs,
    permissions: { notifications: 'YES' },
  });

  // The shared framework's PlatformDetector reads platform info from
  // DeviceInfoCache, which the Appium/Playwright driver fixture normally
  // populates. Detox runs must populate it here or every
  // PlatformDetector.isAndroid()/isIOS() call throws.
  // Window size is not consumed by detox-world code; a standard emulator
  // resolution satisfies the positive-size assertion.
  const platform = await device.getPlatform();
  setDeviceInfo(platform, { width: 1080, height: 2340 });
});
