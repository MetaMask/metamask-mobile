import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { type AppiumElement } from '../../framework';

class ManualBackupStep1View {
  get container(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER,
    );
  }

  get remindMeLaterButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ManualBackupStep1View();
