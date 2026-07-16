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

async function dismissUnlockBlockers(): Promise<void> {
  // Play services heads-up on google_apis CI emulators covers Unlock and
  // makes the control non-interactive until the banner is dismissed.
  PlaywrightUtilities.dismissAndroidHeadsUpNotifications();
  await dismissAndroidSystemOverlaysPlaywright();
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
  await dismissUnlockBlockers();

  if (!(await isPasswordFieldVisible())) {
    return;
  }

  logger.debug('Lock screen detected; unlocking for MM Connect flow');
  const password = getPasswordForScenario('e2e') ?? '123123123';

  let lastError: unknown;
  for (let attempt = 0; attempt < UNLOCK_ATTEMPTS; attempt++) {
    await dismissUnlockBlockers();

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
        await dismissUnlockBlockers();
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
