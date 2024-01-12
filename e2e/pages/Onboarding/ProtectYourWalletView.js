import { ManualBackUpStepsSelectorsIDs } from '../../selectors/Onboarding/ManualBackUpSteps.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class ProtectYourWalletView {
  get container() {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
    );
  }

  get remindMeLaterButton() {
    return Matchers.getElementByID(
      ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON,
    );
  }

  async tapOnRemindMeLaterButton() {
    await Gestures.waitAndTap(this.remindMeLaterButton);
  }
}

export default new ProtectYourWalletView();
