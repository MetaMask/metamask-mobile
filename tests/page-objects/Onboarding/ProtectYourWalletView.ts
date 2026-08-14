import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType } from '../../framework/EncapsulatedElement';
import { PlatformDetector } from '../../framework/PlatformLocator';
import { getDriver } from '../../framework';

class ProtectYourWalletView {
  get container(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
    );
  }

  get remindMeLaterButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    if (PlatformDetector.isIOS()) {
      const drv = getDriver();
      if (drv) {
        try {
          await drv.hideKeyboard();
        } catch {
          // Keyboard may already be dismissed.
        }
      }
    }
    await Gestures.scrollIntoView(this.remindMeLaterButton);
    await Gestures.waitAndTap(this.remindMeLaterButton, {
      elemDescription: 'Protect Your Wallet Remind Me Later Button',
      checkForDisplayed: true,
      checkEnabled: true,
      timeout: 15_000,
    });
  }

  async tapRemindMeLater(): Promise<void> {
    await this.tapOnRemindMeLaterButton();
  }
}

export default new ProtectYourWalletView();
