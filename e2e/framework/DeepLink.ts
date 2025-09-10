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
    // On Android, our production manifest doesn't declare the custom "e2e" scheme.
    // Reuse the already-declared "expo-metamask" scheme to transport the command.
    // Mapping: e2e://perps/<path>?<query> -> expo-metamask://e2e/perps/<path>?<query>
    const mappedUrl = url.startsWith('e2e://perps/')
      ? url.replace('e2e://perps/', 'expo-metamask://e2e/perps/')
      : url;
    if (device.openURL) {
      await device.openURL({ url: mappedUrl });
      return;
    }
    await device.launchApp({ newInstance: false, url: mappedUrl });
  }
}

export default {
  openE2EUrl,
};
