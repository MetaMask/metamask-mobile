import TestHelpers from '../helpers';
import {
  IMPORT_ACCOUNT_SCREEN_ID,
  PRIVATE_KEY_INPUT_BOX_ID,
  IMPORT_PRIVATE_KEY_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Screens/ImportAccountScreen.testIds';
import {
  IMPORT_SUCESS_SCREEN_ID,
  IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID,
} from '../../wdio/screen-objects/testIDs/Screens/ImportSuccessScreen.testIds';
import { CommonSelectorsText } from '../selectors/Common.selectors';

export default class ImportAccountView {
  static async tapImportButton() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(IMPORT_PRIVATE_KEY_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTapByLabel(IMPORT_PRIVATE_KEY_BUTTON_ID);
    }
  }

  static async tapOKAlertButton() {
    await TestHelpers.tapAlertWithButton(CommonSelectorsText.OK_ALERT_BUTTON);
  }

  static async enterPrivateKey(privateKey) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        PRIVATE_KEY_INPUT_BOX_ID,
        privateKey,
      );
      await element(by.id(PRIVATE_KEY_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        PRIVATE_KEY_INPUT_BOX_ID,
        privateKey,
      );
    }
  }

  // Closing import success view
  static async tapCloseButtonOnImportSuccess() {
    await TestHelpers.tap(IMPORT_SUCESS_SCREEN_CLOSE_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(IMPORT_ACCOUNT_SCREEN_ID);
  }

  static async isImportSuccessSreenVisible() {
    await TestHelpers.checkIfVisible(IMPORT_SUCESS_SCREEN_ID);
  }
}
