import TestHelpers from '../../helpers';
import {
  DeleteWalletModalSelectorsIDs,
  DeleteWalletModalSelectorsText,
} from '../../selectors/Modals/DeleteWalletModal.selectors';
import { CommonSelectorsText } from '../../selectors/Common.selectors';

export default class DeleteWalletModal {
  static async tapIUnderstandButton() {
    await TestHelpers.delay(2000);
    await TestHelpers.tapByText(
      DeleteWalletModalSelectorsText.UNDERSTAND_BUTTON,
    );
  }

  static async tapCancelButton() {
    await TestHelpers.tapByText(CommonSelectorsText.CANCEL_BUTTON);
  }
  static async tapDeleteMyWalletButton() {
    await TestHelpers.tapByText(DeleteWalletModalSelectorsText.DELETE_MY);
  }
  static async typeDeleteInInputBox() {
    await TestHelpers.typeTextAndHideKeyboard(
      DeleteWalletModalSelectorsIDs.INPUT,
      'delete',
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(DeleteWalletModalSelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      DeleteWalletModalSelectorsIDs.CONTAINER,
    );
  }
}
