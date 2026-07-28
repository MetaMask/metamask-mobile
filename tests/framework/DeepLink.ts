/*
 * Cross-framework E2E deep link opener (Detox + Appium).
 */
import { createLogger } from './logger.ts';
import { E2EDeeplinkSchemes } from './Constants.ts';
import { FrameworkDetector } from './FrameworkDetector.ts';
import { PlatformDetector } from './PlatformLocator.ts';
import { executeMobileDeepLink, getDriver } from './PlaywrightUtilities.ts';
import { sleep } from './Utilities.ts';

const logger = createLogger({
  name: 'E2E - DeepLink',
});

const E2E_SCHEME_TO_METAMASK_PREFIX: Record<E2EDeeplinkSchemes, string> = {
  [E2EDeeplinkSchemes.PERPS]: 'metamask://e2e/perps/',
  [E2EDeeplinkSchemes.QR_SYNC]: 'metamask://e2e/qr-sync/',
};

const mapToMetamaskScheme = (url: string): string => {
  let mappedUrl = url;
  for (const deeplinkScheme of Object.values(E2EDeeplinkSchemes)) {
    if (url.startsWith(deeplinkScheme)) {
      const pathSuffix = url.slice(deeplinkScheme.length); // <path>?<query>
      mappedUrl = `${E2E_SCHEME_TO_METAMASK_PREFIX[deeplinkScheme]}${pathSuffix}`;
      logger.debug(`Mapped E2E DeepLink to metamask scheme: ${mappedUrl}`);
      break;
    }
  }
  return mappedUrl;
};

export async function openE2EUrl(url: string): Promise<void> {
  logger.debug(`Opening E2E DeepLink: ${url}`);
  const mappedUrl = mapToMetamaskScheme(url);

  if (FrameworkDetector.isAppium()) {
    await executeMobileDeepLink(mappedUrl);
    // Warm Android sessions often need a brief settle for RN Linking / onNewIntent.
    if (PlatformDetector.isAndroid()) {
      const drv = getDriver();
      const capabilities = (drv?.capabilities ?? {}) as Record<string, unknown>;
      const pkgCandidate =
        capabilities['appium:appPackage'] ?? capabilities.appPackage;
      const pkg = typeof pkgCandidate === 'string' ? pkgCandidate : undefined;
      if (pkg) {
        await drv.activateApp(pkg);
      }
      await sleep(1_500);
    } else {
      await sleep(500);
    }
    return;
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
