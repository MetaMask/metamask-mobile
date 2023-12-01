import TestHelpers from '../../helpers';
import { ManualBackUpStep2SelectorsIDs } from '../../selectors/Onboarding/ManualBackUpStep2.selectors';
import { ManualBackUpStep1SelectorsIDs } from '../../selectors/Onboarding/ManualBackUpStep1.selectors';

export default class ProtectYourWalletView {
  static async tapOnRemindMeLaterButton() {
    await TestHelpers.tap(
      ManualBackUpStep1SelectorsIDs.REMIND_ME_LATER_BUTTON_ID,
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ManualBackUpStep2SelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      ManualBackUpStep2SelectorsIDs.CONTAINER,
    );
  }
}
