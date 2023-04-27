import TestHelpers from '../../helpers';
import {
  ENTER_ALIAS_INPUT_BOX_ID,
  ADD_ADDRESS_MODAL_CONTAINER_ID,
} from '../../../app/constants/test-ids';

export default class AddAddressModal {
  static async typeInAlias(name) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(ENTER_ALIAS_INPUT_BOX_ID, name);
      await element(by.id(ENTER_ALIAS_INPUT_BOX_ID)).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(ENTER_ALIAS_INPUT_BOX_ID, name);
    }
  }

  static async tapSaveButton() {
    await TestHelpers.tapByText('Save');
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }
}
