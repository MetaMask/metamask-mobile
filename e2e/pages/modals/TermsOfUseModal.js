import TestHelpers from '../../helpers';
import {
  TERMS_OF_USE_ACCEPT_BUTTON_ID,
  TERMS_OF_USE_CHECKBOX_ICON_ID,
  TERMS_OF_USE_SCREEN_ID,
  TERMS_OF_USE_SCROLL_END_ARROW_BUTTON_ID,
} from '../../../wdio/screen-objects/testIDs/Components/TermsOfUse.testIds';

export default class TermsOfUseModal {
  static async isDisplayed() {
    await TestHelpers.checkIfVisible(TERMS_OF_USE_SCREEN_ID);
  }

  static async isNotDisplayed() {
    await TestHelpers.checkIfNotVisible(TERMS_OF_USE_SCREEN_ID);
  }

  static async tapAgreeCheckBox() {
    await TestHelpers.waitAndTap(TERMS_OF_USE_CHECKBOX_ICON_ID);
  }

  static async tapScrollEndButton() {
    await TestHelpers.waitAndTap(TERMS_OF_USE_SCROLL_END_ARROW_BUTTON_ID);
  }

  static async tapAcceptButton() {
    await TestHelpers.waitAndTap(TERMS_OF_USE_ACCEPT_BUTTON_ID);
  }
}
