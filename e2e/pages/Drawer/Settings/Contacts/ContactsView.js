import TestHelpers from '../../../../helpers';
import {
  CONTACT_ADD_BUTTON,
  CONTACTS_CONTAINER_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/Contacts.testids';

export default class ContactsView {
  static async tapAddContactButton() {
    await TestHelpers.waitAndTap(CONTACT_ADD_BUTTON);
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
