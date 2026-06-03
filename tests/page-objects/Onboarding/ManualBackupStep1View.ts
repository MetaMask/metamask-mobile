import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class ManualBackupStep1View {
  get container(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER,
        ),
    });
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
        ),
    });
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ManualBackupStep1View();
