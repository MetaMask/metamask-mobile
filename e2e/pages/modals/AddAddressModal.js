import TestHelpers from '../../helpers';
import {
  ADDRESS_ALIAS_SAVE_BUTTON_ID,
  ADDRESS_ALIAS_TITLE_ID,
} from '../../../wdio/screen-objects/testIDs/Screens/AddressBook.testids';
import { AddAddressModalSelectorsIDs } from '../../selectors/Modals/AddAddressModal.selectors';

export default class AddAddressModal {
  static async typeInAlias(name) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
        name,
      );
      await element(
        by.id(AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT),
      ).tapReturnKey();
    } else {
      await TestHelpers.typeTextAndHideKeyboard(
        AddAddressModalSelectorsIDs.ENTER_ALIAS_INPUT,
        name,
      );
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
    await TestHelpers.checkIfVisible(AddAddressModalSelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(AddAddressModalSelectorsIDs.CONTAINER);
  }
}
