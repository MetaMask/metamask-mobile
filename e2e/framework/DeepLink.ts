/*
 * Cross-platform deep link opener for Detox tests.
 */
import { createLogger } from './logger';
import { E2EDeeplinkSchemes } from './Constants';

const logger = createLogger({
  name: 'E2E - DeepLink',
});

export async function openE2EUrl(url: string): Promise<void> {
  logger.debug(`Opening E2E DeepLink: ${url}`);
  if (device.getPlatform() === 'ios' && device.openURL) {
    await device.openURL({ url });
    return;
  }
  if (device.getPlatform() === 'android' && device.launchApp) {
    // On Android, our production manifest doesn't declare the custom "e2e" scheme.
    // Reuse the already-declared "expo-metamask" scheme to transport the command.
    // Mapping: e2e://perps/<path>?<query> -> expo-metamask://e2e/perps/<path>?<query>
    let mappedUrl = url;
    // Handle all E2EDeeplinkSchemes
    for (const deeplinkScheme of Object.values(E2EDeeplinkSchemes)) {
      if (url.startsWith(deeplinkScheme)) {
        mappedUrl = url.replace(
          deeplinkScheme,
          `expo-metamask://${deeplinkScheme}`,
        );
        break;
      }
    }

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
