import TestHelpers from '../../helpers';
import {
  ENTER_ALIAS_INPUT_BOX_ID,
  ADD_ADDRESS_MODAL_CONTAINER_ID,
} from '../../../app/constants/test-ids';
import {
  ADDRESS_ALIAS_SAVE_BUTTON_ID,
  ADDRESS_ALIAS_TITLE_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/AddressBook.testids';

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
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(ADDRESS_ALIAS_SAVE_BUTTON_ID);
    } else {
      await TestHelpers.waitAndTap(ADDRESS_ALIAS_SAVE_BUTTON_ID);
    }
  }

  static async tapTitle() {
    await TestHelpers.waitAndTap(ADDRESS_ALIAS_TITLE_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ADD_ADDRESS_MODAL_CONTAINER_ID);
  }
}
