import LoginView from '../wallet/LoginView';
import { createLogger } from '../../framework';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import PlaywrightUtilities from '../../framework/PlaywrightUtilities';

const logger = createLogger({
  name: 'MMConnectUnlockHelpers',
});

/**
 * If MetaMask's lock / login screen is showing, unlock with the e2e password.
 *
 * Prefer the password field over the outer login container — after a deeplink
 * the lock screen is often the only UI, and CI auto-lock hits right after
 * returning to MetaMask for dapp connect.
 */
export async function unlockIfLockScreenVisible(): Promise<void> {
  PlaywrightUtilities.collapseStatusBar();

  try {
    const passwordInput = await asPlaywrightElement(LoginView.passwordInput);
    if (!(await passwordInput.isVisible())) {
      return;
    }
  } catch {
    return;
  }

  logger.debug('Lock screen detected; unlocking for MM Connect flow');
  await loginToAppPlaywright({ scenarioType: 'e2e' });
}
