import TestHelpers from '../../helpers';
import {
  TOGGLE_ETH_SIGN_CONTINUE_BUTTON,
  TOGGLE_ETH_SIGN_MODAL,
  TOGGLE_ETH_SIGN_UNDERSTAND_CHECKBOX,
  TOGGLE_ETH_SIGN_UNDERSTAND_INPUT,
} from '../../../wdio/screen-objects/testIDs/Components/ToggleEthSignModal.testIds';

export default class ToggleEthSignModal {
  static async isVisible() {
    await TestHelpers.checkIfVisible(TOGGLE_ETH_SIGN_MODAL);
  }

  static async tapIUnderstandCheckbox() {
    await TestHelpers.waitAndTap(TOGGLE_ETH_SIGN_UNDERSTAND_CHECKBOX);
  }

  static async enterIUnderstandToContinue(text) {
    await TestHelpers.typeTextAndHideKeyboard(
      TOGGLE_ETH_SIGN_UNDERSTAND_INPUT,
      text,
    );
  }

  static async tapContinueButton() {
    await TestHelpers.waitAndTap(TOGGLE_ETH_SIGN_CONTINUE_BUTTON);
  }
}
