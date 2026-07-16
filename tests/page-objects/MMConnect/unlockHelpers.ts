/* eslint-disable import-x/no-nodejs-modules */
import { execSync } from 'child_process';
import LoginView from '../wallet/LoginView';
import { createLogger, sleep } from '../../framework';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';
import { getPasswordForScenario } from '../../framework/utils/TestConstants';
import { dismissAndroidSystemOverlaysPlaywright } from '../../flows/general.flow';
import PlaywrightUtilities from '../../framework/PlaywrightUtilities';
import UnifiedGestures from '../../framework/UnifiedGestures';

const logger = createLogger({
  name: 'MMConnectUnlockHelpers',
});

const UNLOCK_ATTEMPTS = 3;
const LOCK_GONE_TIMEOUT_MS = 10_000;

let headsUpNotificationsDisabled = false;

/**
 * CI emulators often show a persistent "Enable Google Play services" heads-up
 * that makes the Unlock control report as non-interactive to UiAutomator2.
 */
function disableHeadsUpNotificationsBestEffort(): void {
  if (headsUpNotificationsDisabled) {
    return;
  }
  try {
    execSync('adb shell settings put global heads_up_notifications_enabled 0', {
      stdio: 'pipe',
    });
    headsUpNotificationsDisabled = true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.debug(`Could not disable heads-up notifications: ${message}`);
  }
}

async function isPasswordFieldVisible(): Promise<boolean> {
  try {
    const passwordInput = await asPlaywrightElement(LoginView.passwordInput);
    return await passwordInput.isVisible();
  } catch {
    return false;
  }
}

async function waitForLockScreenGone(timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await isPasswordFieldVisible())) {
      return true;
    }
    await sleep(300);
  }
  return false;
}

/**
 * If MetaMask's lock / login screen is showing, unlock with the e2e password.
 *
 * Prefer the password field over the outer login container — after a deeplink
 * the lock screen is often the only UI, and CI auto-lock hits right after
 * returning to MetaMask for dapp connect.
 *
 * Intentionally does NOT use full {@link loginToAppPlaywright}: after a connect
 * deeplink we expect the permission sheet (not wallet home).
 */
export async function unlockIfLockScreenVisible(): Promise<void> {
  PlaywrightUtilities.collapseStatusBar();
  await dismissAndroidSystemOverlaysPlaywright();
  disableHeadsUpNotificationsBestEffort();

  if (!(await isPasswordFieldVisible())) {
    return;
  }

  logger.debug('Lock screen detected; unlocking for MM Connect flow');
  const password = getPasswordForScenario('e2e') ?? '123123123';

  let lastError: unknown;
  for (let attempt = 0; attempt < UNLOCK_ATTEMPTS; attempt++) {
    PlaywrightUtilities.collapseStatusBar();
    await dismissAndroidSystemOverlaysPlaywright();

    try {
      await LoginView.enterPassword(password);
      try {
        await LoginView.tapLoginButton();
      } catch (tapError) {
        logger.debug(
          `Unlock interactive tap failed (attempt ${attempt + 1}); plain tap fallback: ${
            tapError instanceof Error ? tapError.message : String(tapError)
          }`,
        );
        await UnifiedGestures.waitAndTap(LoginView.loginButton, {
          description: 'Login Button (unlock fallback)',
          checkForDisplayed: true,
          checkForEnabled: true,
          waitForInteractive: false,
          timeout: 10_000,
        });
      }

      if (await waitForLockScreenGone(LOCK_GONE_TIMEOUT_MS)) {
        return;
      }
      lastError = new Error(
        'Lock screen still visible after unlock tap',
      );
    } catch (error) {
      lastError = error;
      logger.debug(
        `Unlock attempt ${attempt + 1} failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await sleep(500);
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to unlock MetaMask lock screen: ${String(lastError)}`);
}
