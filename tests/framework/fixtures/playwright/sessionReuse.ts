import { ProviderName, type WebDriverConfig } from '../../types.ts';

/**
 * Whether Appium WebDriver sessions should be reused across Playwright tests
 * in the same worker.
 *
 * - BrowserStack: always false (out of scope)
 * - APPIUM_SESSION_REUSE=false|0: force off (rollback)
 * - APPIUM_SESSION_REUSE=true|1: force on
 * - default: true for emulator/simulator
 */
export function isAppiumSessionReuseEnabled(
  projectUse: Pick<WebDriverConfig, 'device'>,
): boolean {
  if (projectUse.device?.provider === ProviderName.BROWSERSTACK) {
    return false;
  }

  // Bracket access avoids babel transform-inline-environment-variables so
  // APPIUM_SESSION_REUSE can be toggled at runtime (local + tests).
  // eslint-disable-next-line dot-notation
  const flag = process.env['APPIUM_SESSION_REUSE']?.trim().toLowerCase();
  if (flag === 'false' || flag === '0') {
    return false;
  }
  if (flag === 'true' || flag === '1') {
    return true;
  }

  return true;
}
