import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import type { AppiumElement } from '../../framework/AppiumElement';
import { PlatformDetector } from '../../framework/PlatformLocator';

class ProtectYourWalletView {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
    );
  }

  get remindMeLaterButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    if (PlatformDetector.isIOS()) {
      await Gestures.hideKeyboard();
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
