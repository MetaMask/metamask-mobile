import LoginView from '../../page-objects/wallet/LoginView';
import { PlaywrightAssertions } from '../../framework';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';
import { loginToAppPlaywright } from '../../flows/wallet.flow';

const UNLOCK_WAIT_MS = 5000;

/**
 * If the app auto-locked and the unlock/login screen is displayed, enter password and unlock.
 * Uses performance login credentials (default scenarioType).
 */
export async function unlockIfLockScreenVisible(): Promise<void> {
  try {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(LoginView.container),
      { timeout: UNLOCK_WAIT_MS },
    );
    await loginToAppPlaywright();
  } catch {
    // Unlock screen not shown within timeout; continue
  }
}
