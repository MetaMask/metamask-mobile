/*
 * Cross-platform deep link opener for Detox tests.
 */
import { createLogger } from './logger.ts';
import { E2EDeeplinkSchemes } from './Constants.ts';

const logger = createLogger({
  name: 'E2E - DeepLink',
});

const E2E_SCHEME_TO_METAMASK_PREFIX: Record<E2EDeeplinkSchemes, string> = {
  [E2EDeeplinkSchemes.PERPS]: 'metamask://e2e/perps/',
  [E2EDeeplinkSchemes.QR_SYNC]: 'metamask://e2e/qr-sync/',
};

export async function openE2EUrl(url: string): Promise<void> {
  logger.debug(`Opening E2E DeepLink: ${url}`);
  // Map any E2E scheme to the declared "metamask" scheme for both platforms
  let mappedUrl = url;
  for (const deeplinkScheme of Object.values(E2EDeeplinkSchemes)) {
    if (url.startsWith(deeplinkScheme)) {
      const pathSuffix = url.slice(deeplinkScheme.length); // <path>?<query>
      mappedUrl = `${E2E_SCHEME_TO_METAMASK_PREFIX[deeplinkScheme]}${pathSuffix}`;
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
