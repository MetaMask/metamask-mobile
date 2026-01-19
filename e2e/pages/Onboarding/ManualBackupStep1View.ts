import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

class ManualBackupStep1View {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.STEP_1_CONTAINER,
    );
  }

  get remindMeLaterButton(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  async tapOnRemindMeLaterButton(): Promise<void> {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ManualBackupStep1View();
