/*
 * Cross-platform deep link opener for Detox tests.
 */

// Import device from Detox types to avoid shadowing warnings
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const device: any; // eslint-disable-line @typescript-eslint/no-explicit-any

export async function openE2EUrl(url: string): Promise<void> {
  // eslint-disable-next-line no-console
  console.log(`[E2E] DeepLink open: ${url}`);
  if (device.getPlatform() === 'ios' && device.openURL) {
    await device.openURL({ url });
    return;
  }
  if (device.getPlatform() === 'android' && device.launchApp) {
    await device.launchApp({ newInstance: false, url });
  }
}

export default {
  openE2EUrl,
};
