import TestHelpers from '../../helpers';
import {
  SKIP_BACKUP_MODAL,
  ANDROID_SKIP_BACKUP_BUTTON_ID,
  SKIP_BUTTON,
  iOS_SKIP_BACKUP_BUTTON_ID,
} from '../../../wdio/screen-objects/testIDs/Components/SkipAccountSecurityModalTestIds';

export default class SkipAccountSecurityModal {
  static async tapIUnderstandCheckBox() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(iOS_SKIP_BACKUP_BUTTON_ID);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.tap(ANDROID_SKIP_BACKUP_BUTTON_ID);
    }
  }

  static async tapSkipButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tap(SKIP_BUTTON);
    } else {
      // Tap by the I understand text
      await TestHelpers.delay(1000);
      await TestHelpers.waitAndTapByLabel(SKIP_BUTTON);
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(SKIP_BACKUP_MODAL);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SKIP_BACKUP_MODAL);
  }
}
