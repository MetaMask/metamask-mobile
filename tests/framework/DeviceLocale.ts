import type { CurrentDeviceDetails } from './fixtures/playwright/types.js';
import { runDeviceCommand } from './services/device-commands/commandRunner.js';

/**
 * Normalizes locale strings to BCP 47 (hyphen-separated), matching `I18n.locale`.
 */
export function normalizeLocale(locale: string): string {
  return locale.trim().replace(/_/g, '-');
}

/**
 * Parses the first language from `defaults read NSGlobalDomain AppleLanguages` output.
 */
export function parseAppleLanguagesOutput(stdout: string): string {
  const quoted = stdout.match(/"([^"]+)"/);
  if (quoted?.[1]) {
    return normalizeLocale(quoted[1]);
  }

  const trimmed = stdout.trim();
  if (trimmed && !trimmed.startsWith('(')) {
    return normalizeLocale(trimmed);
  }

  throw new Error(`Could not parse AppleLanguages output: ${stdout}`);
}

/**
 * Reads the device locale that MetaMask exposes via `I18n.locale` (react-native-i18n).
 *
 * iOS: first entry in `AppleLanguages` on the simulator.
 * Android: `system_locales` with fallback to `persist.sys.locale`.
 */
export async function getDeviceLocale(
  currentDeviceDetails: CurrentDeviceDetails,
): Promise<string> {
  if (currentDeviceDetails.isBrowserstack) {
    throw new Error('getDeviceLocale does not support BrowserStack devices.');
  }

  if (currentDeviceDetails.platform === 'ios') {
    const simDevice =
      currentDeviceDetails.udid?.trim() ??
      currentDeviceDetails.deviceName?.trim();
    if (!simDevice) {
      throw new Error(
        'getDeviceLocale requires currentDeviceDetails.udid or deviceName for iOS.',
      );
    }

    const { stdout } = await runDeviceCommand('xcrun', [
      'simctl',
      'spawn',
      simDevice,
      'defaults',
      'read',
      'NSGlobalDomain',
      'AppleLanguages',
    ]);

    return parseAppleLanguagesOutput(stdout);
  }

  if (currentDeviceDetails.platform === 'android') {
    const serial = currentDeviceDetails.udid?.trim();
    if (!serial) {
      throw new Error(
        'getDeviceLocale requires currentDeviceDetails.udid for Android.',
      );
    }

    const { stdout: systemLocalesStdout } = await runDeviceCommand('adb', [
      '-s',
      serial,
      'shell',
      'settings',
      'get',
      'system',
      'system_locales',
    ]);
    const systemLocales = systemLocalesStdout.trim();
    if (systemLocales && systemLocales !== 'null') {
      return normalizeLocale(systemLocales.split(',')[0]);
    }

    const { stdout: persistLocaleStdout } = await runDeviceCommand('adb', [
      '-s',
      serial,
      'shell',
      'getprop',
      'persist.sys.locale',
    ]);
    const persistLocale = persistLocaleStdout.trim();
    if (persistLocale) {
      return normalizeLocale(persistLocale);
    }

    const { stdout: productLocaleStdout } = await runDeviceCommand('adb', [
      '-s',
      serial,
      'shell',
      'getprop',
      'ro.product.locale',
    ]);
    const productLocale = productLocaleStdout.trim();
    if (productLocale) {
      return normalizeLocale(productLocale);
    }

    throw new Error(`Could not read Android device locale for ${serial}`);
  }

  throw new Error(
    `getDeviceLocale does not support platform "${currentDeviceDetails.platform}".`,
  );
}
