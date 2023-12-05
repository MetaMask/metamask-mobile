import TestHelpers from '../../helpers';
import { ManualBackUpSelectorsIDs } from '../../selectors/Onboarding/ManualBackUp.selectors';

export default class ProtectYourWalletView {
  static async tapOnRemindMeLaterButton() {
    await TestHelpers.tap(ManualBackUpSelectorsIDs.REMIND_ME_LATER_BUTTON);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(
      ManualBackUpSelectorsIDs.PROTECT_CONTAINER,
    );
  }
}
