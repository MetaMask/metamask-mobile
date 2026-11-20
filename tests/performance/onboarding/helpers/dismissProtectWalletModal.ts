import ProtectYourWalletModal from '../../../page-objects/Onboarding/ProtectYourWalletModal.js';
import SkipAccountSecurityModal from '../../../page-objects/Onboarding/SkipAccountSecurityModal.js';
import { withImplicitWait } from '../../../framework/AppiumUtilities.js';

/*
 * Moved unchanged from new-wallet-account-creation.spec.ts so the spec and its
 * scenario share it: dismisses the "protect your wallet" modal (and the
 * skip-account-security confirmation) when it shows up.
 */
export const dismissProtectWalletModalIfPresent = async (
  timeoutMs = 1_000,
): Promise<void> => {
  let backupAlertVisible = false;
  try {
    backupAlertVisible = await withImplicitWait(0, async () => {
      const backupAlert = await ProtectYourWalletModal.collapseWalletModal;
      await backupAlert.unwrap().waitForDisplayed({ timeout: timeoutMs });
      return true;
    });
  } catch {
    return;
  }

  if (!backupAlertVisible) {
    return;
  }

  await ProtectYourWalletModal.tapRemindMeLaterButton();

  let skipAccountSecurityVisible = false;
  try {
    skipAccountSecurityVisible = await withImplicitWait(0, async () => {
      const skipAccountSecurity = await SkipAccountSecurityModal.container;
      await skipAccountSecurity.unwrap().waitForDisplayed({
        timeout: timeoutMs,
      });
      return true;
    });
  } catch {
    return;
  }

  if (skipAccountSecurityVisible) {
    await SkipAccountSecurityModal.proceedWithoutWalletSecure();
  }
};
