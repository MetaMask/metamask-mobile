import TestHelpers from '../../helpers';
import {
  DELETE_WALLET_CONTAINER_ID,
  DELETE_WALLET_INPUT_BOX_ID,
} from '../../../app/constants/test-ids';

export default class DeleteWalletModal {
  static async tapIUnderstandButton() {
    await TestHelpers.delay(2000);
    await TestHelpers.tapByText('I understand, continue');
  }

  static async tapCancelButton() {
    await TestHelpers.tapByText('Cancel');
  }
  static async tapDeleteMyWalletButton() {
    await TestHelpers.tapByText('Delete my wallet');
  }
  static async typeDeleteInInputBox() {
    await TestHelpers.typeTextAndHideKeyboard(
      DELETE_WALLET_INPUT_BOX_ID,
      'delete',
    );
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(DELETE_WALLET_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(DELETE_WALLET_CONTAINER_ID);
  }
}
