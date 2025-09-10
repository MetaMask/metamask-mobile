/*
 * Cross-platform deep link opener for Detox tests.
 * Tries iOS path first; if it fails, falls back to Android path.
 */

// Import device from Detox types to avoid shadowing warnings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const device: any; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function openE2EUrl(url: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[E2E] DeepLink open: ${url}`);

  try {
    if (device.getPlatform() === 'ios' && device.openURL) {
      await device.openURL({ url });
      return;
    }
  } catch (e) {
    // Fall through to Android path
  }

  // Android fallback (and generic fallback)
  if (device.getPlatform() === 'android' && device.launchApp) {
    await device.launchApp({ newInstance: false, url });
  }
}

export default {
  openE2EUrl,
};
