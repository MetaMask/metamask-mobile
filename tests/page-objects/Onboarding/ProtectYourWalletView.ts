import { ManualBackUpStepsSelectorsIDs } from '../../../app/components/Views/ManualBackupStep1/ManualBackUpSteps.testIds.ts';
import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';

class ProtectYourWalletView {
  get container(): DetoxElement {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
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

export default new ProtectYourWalletView();
