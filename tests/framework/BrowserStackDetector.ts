import { ProviderName } from './types.ts';

/**
 * Strict BrowserStack cloud detection.
 *
 * Determines whether the active test project targets BrowserStack devices.
 * This intentionally does NOT read `BROWSERSTACK_LOCAL` — local tunnel enablement
 * is separate (`isBrowserStackLocal()`).
 */
let explicitOverride: boolean | undefined;

/**
 * Manually override BrowserStack detection (tests or fixture bootstrap).
 */
export function setBrowserStackMode(isBrowserStackRun: boolean): void {
  explicitOverride = isBrowserStackRun;
}

/**
 * Clears any explicit BrowserStack override.
 */
export function resetBrowserStackMode(): void {
  explicitOverride = undefined;
}

/**
 * Returns true when a Playwright project name targets BrowserStack cloud devices.
 */
export function isBrowserStackProjectName(projectName: string): boolean {
  const normalizedName = projectName.toLowerCase();
  return (
    normalizedName.includes('browserstack') ||
    normalizedName === 'android-onboarding' ||
    normalizedName === 'ios-onboarding'
  );
}

function parseProjectNameFromArgv(): string | undefined {
  const args = process.argv;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === '--project' && args[index + 1]) {
      return args[index + 1];
    }
  }
  return undefined;
}

/**
 * Returns true when tests run against BrowserStack cloud devices.
 */
export function isBrowserStack(): boolean {
  if (explicitOverride !== undefined) {
    return explicitOverride;
  }

  const projectName = parseProjectNameFromArgv();
  if (projectName && isBrowserStackProjectName(projectName)) {
    return true;
  }

  return false;
}

/**
 * Returns true when BrowserStack Local tunnel capabilities are enabled.
 */
export function isBrowserStackLocal(): boolean {
  return process.env.BROWSERSTACK_LOCAL?.toLowerCase() === 'true';
}

/**
 * Initializes BrowserStack detection from Playwright device provider config.
 */
export function syncBrowserStackModeFromProvider(
  provider: ProviderName | undefined,
): void {
  setBrowserStackMode(provider === ProviderName.BROWSERSTACK);
}
