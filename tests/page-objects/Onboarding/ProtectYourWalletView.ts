import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

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
      appium: {
        android: () => PlaywrightMatchers.getElementByText('Remind me later'),
        ios: () =>
          PlaywrightMatchers.getElementByAccessibilityId(
            'remind-me-later-button',
          ),
      },
    });
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.remindMeLaterButton, {
      description: 'Protect Your Wallet Remind Me Later Button',
    });
  }

  async tapRemindMeLater(): Promise<void> {
    await this.tapOnRemindMeLaterButton();
  }
}

export default new ProtectYourWalletView();
