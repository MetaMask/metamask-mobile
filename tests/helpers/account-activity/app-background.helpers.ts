import { getDriver } from '../../framework/PlaywrightUtilities.js';
import { PlatformDetector } from '../../framework/PlatformLocator.js';

export async function sendAppToHome(): Promise<void> {
  const drv = getDriver();
  if (!drv) {
    throw new Error('Driver is not available');
  }

  if (PlatformDetector.isIOS()) {
    await drv.execute('mobile: pressButton', { name: 'home' });
    return;
  }

  await drv.pressKeyCode(3);
}
