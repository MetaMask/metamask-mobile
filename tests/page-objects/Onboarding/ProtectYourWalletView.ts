import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  asDetoxElement,
  asPlaywrightElement,
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import { encapsulatedAction } from '../../framework/encapsulatedAction';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import { PlatformDetector } from '../../framework/PlatformLocator';

class ProtectYourWalletView {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
    );
  }

  get remindMeLaterButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
          { exact: true },
        ),
    });
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(asDetoxElement(this.remindMeLaterButton), {
          elemDescription: 'Protect Your Wallet Remind Me Later Button',
        });
      },
      appium: async () => {
        if (await PlatformDetector.isIOS()) {
          await PlaywrightGestures.hideKeyboard();
        }
        const button = await asPlaywrightElement(this.remindMeLaterButton);
        await PlaywrightGestures.scrollIntoView(button);
        await PlaywrightGestures.waitAndTap(button, {
          checkForDisplayed: true,
          checkForEnabled: true,
          timeout: 15_000,
        });
      },
    });
  }

  async tapRemindMeLater(): Promise<void> {
    await this.tapOnRemindMeLaterButton();
  }
}

export default new ProtectYourWalletView();
