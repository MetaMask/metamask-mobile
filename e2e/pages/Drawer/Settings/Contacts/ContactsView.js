import TestHelpers from '../../../../helpers';
import {
  CONTACT_ADDRESS_INPUT,
  CONTACTS_CONTAINER_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/Contacts.testids';

const ADD_CONTACT_BUTTON_ID = 'add-contact-button';

export default class ContactsView {
  static async tapAddContactButton() {
    await TestHelpers.tap(ADD_CONTACT_BUTTON_ID);
  }

  static async clearAddressInputBox() {
    await TestHelpers.clearField(CONTACT_ADDRESS_INPUT);
  }

  static async tapOnAlias(alias) {
    await TestHelpers.tapByText(alias);
  }

  // Assertions

  static async isVisible() {
    await TestHelpers.checkIfVisible(CONTACTS_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(CONTACTS_CONTAINER_ID);
  }

  static async isContactAliasVisible(alias) {
    await TestHelpers.checkIfElementWithTextIsVisible(alias);
  }
  static async isContactAliasNotVisible(alias) {
    await TestHelpers.checkIfElementWithTextIsNotVisible(alias);
  }
}
