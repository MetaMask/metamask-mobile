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
  // Map any E2E scheme to the declared "metamask" scheme for both platforms
  let mappedUrl = url;
  for (const deeplinkScheme of Object.values(E2EDeeplinkSchemes)) {
    if (url.startsWith(deeplinkScheme)) {
      const pathSuffix = url.slice(deeplinkScheme.length); // <path>?<query>
      mappedUrl = `metamask://e2e/perps/${pathSuffix}`;
      logger.debug(`Mapped E2E DeepLink to metamask scheme: ${mappedUrl}`);
      break;
    }
  }

  if (device.getPlatform() === 'ios' && device.openURL) {
    await device.openURL({ url: mappedUrl });
    return;
  }
  if (device.getPlatform() === 'android' && device.launchApp) {
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
