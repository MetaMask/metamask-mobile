import TestHelpers from '../../helpers';
import { ManualBackUpStepsSelectorsIDs } from '../../selectors/Onboarding/ManualBackUpSteps.selectors';

export default class ProtectYourWalletView {
  static async tapOnRemindMeLaterButton() {
    await TestHelpers.tap(ManualBackUpStepsSelectorsIDs.REMIND_ME_LATER_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ManualBackUpStepsSelectorsIDs.PROTECT_CONTAINER,
    );
  }
}
