import { getDefaultProvider } from 'ethers';
import Gestures from '../Gestures';

import {
  ANDROID_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID,
  iOS_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID,
  CONFIRM_PASSWORD_INPUT_BOX_ID,
  IOS_I_UNDERSTAND_BUTTON_ID,
  ANDROID_SKIP_ACCOUNT_SECURITY_BUTTON_ID,
  CREATE_PASSWORD_BUTTON_ID,
} from '../../../test-ids';

const SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID = 'skip-backup-modal';
const iOS_I_UNDERSTAND_BUTTON_ID = 'skip-backup-check';
const ANDROID_I_UNDERSTAND_BUTTON_ID = 'skip-backup-text';
const SKIP_ACCOUNT_SECURITY_BUTTON_ID = 'skip-backup-Button';
class SkipAccountSecurityModal {
  get SkipAccountSecurityModalContainer() {
    return $(`~${SKIP_ACCOUNT_SECURITY_MODAL_CONTAINER_ID}`);
  }

  async tapIUnderstandCheckBox() {
    return driver.capabilities.platformName === 'Android'
      ? await Gestures.tap(ANDROID_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID)
      : await Gestures.tap(iOS_SKIP_ACCOUNT_SECURITY_I_UNDERSTAND_BUTTON_ID);
  }

  // static async tapIUnderstandCheckBox() {
  //   if (device.getPlatform() === 'ios') {
  //     await TestHelpers.tap(iOS_I_UNDERSTAND_BUTTON_ID);
  //   } else {
  //     // Tap by the I understand text
  //     await TestHelpers.delay(1000);
  //     await TestHelpers.tap(ANDROID_I_UNDERSTAND_BUTTON_ID);
  //   }
  // }

  async tapSkipButton() {
    await Gestures.waitAndTap(SKIP_ACCOUNT_SECURITY_BUTTON_ID);
  }

  async isVisible() {
    await expect(this.SkipAccountSecurityModalContainer).toBeDisplayed();
  }

  async isNotVisible() {
    await expect(this.SkipAccountSecurityModalContainer).not.toBeDisplayed();
  }
}

export default new SkipAccountSecurityModal();
