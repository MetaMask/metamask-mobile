import TestHelpers from '../../../../helpers';

import { BACK_ARROW_BUTTON_ID } from '../../../../../app/constants/test-ids';

const ADD_CONTACT_BUTTON_ID = 'contact-add-contact-button';
const ADD_CONTACT_CONTAINER_ID = 'add-contact-screen';
const ADD_CONTACTS_VIEW_CONTACT_INPUT_BOX_ID = 'contact-name-input';
const ADD_CONTACTS_VIEW_ADDRESS_INPUT_BOX_ID = 'contact-address-input';
const ERROR_MESSAGE_LABEL_ID = 'error-message-warning';
const MEMO_INPUT_BOX_ID = 'contact-memo-input';

export default class AddContactView {
  static async tapAddContactButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.tap(ADD_CONTACT_BUTTON_ID);
      await TestHelpers.delay(700);
      await TestHelpers.tap(ADD_CONTACT_BUTTON_ID);
    } else {
      await TestHelpers.tap(ADD_CONTACT_BUTTON_ID);
    }
  }

  static async tapEditButton() {
    await TestHelpers.tapByText('Edit'); // edit button when you tap on the alias
  }

  static async tapEditContactCTA() {
    await TestHelpers.tapByText('Edit contact'); // edit CTA button after you make changes to a contact
  }

  static async tapBackButton() {
    await TestHelpers.tap(BACK_ARROW_BUTTON_ID);
  }

  static async tapDeleteContactCTA() {
    await TestHelpers.tapByText('Delete');
    if (device.getPlatform() === 'ios') {
      await TestHelpers.tapByText('Delete', 1);
    } else {
      await TestHelpers.tapByText('Delete');
    }
  }

  static async typeInName(name) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(
        ADD_CONTACTS_VIEW_CONTACT_INPUT_BOX_ID,
        name,
      );
      await element(
        by.id(ADD_CONTACTS_VIEW_CONTACT_INPUT_BOX_ID),
      ).tapReturnKey();
    } else {
      await TestHelpers.replaceTextInField(
        ADD_CONTACTS_VIEW_CONTACT_INPUT_BOX_ID,
        name,
      );
    }
  }
  static async typeInMemo(memo) {
    await TestHelpers.replaceTextInField(MEMO_INPUT_BOX_ID, memo);
  }

  static async typeInAddress(address) {
    await TestHelpers.replaceTextInField(
      ADD_CONTACTS_VIEW_ADDRESS_INPUT_BOX_ID,
      address,
    );
  }

  static async clearAddressInputBox() {
    await TestHelpers.clearField(ADD_CONTACTS_VIEW_ADDRESS_INPUT_BOX_ID);
  }

  // Assertions

  static async isVisible() {
    await TestHelpers.checkIfVisible(ADD_CONTACT_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ADD_CONTACT_CONTAINER_ID);
  }

  static async isErrorMessageVisible() {
    await TestHelpers.checkIfVisible(ERROR_MESSAGE_LABEL_ID);
  }
  static async isErrorMessageTextCorrect() {
    await TestHelpers.checkIfElementHasString(
      ERROR_MESSAGE_LABEL_ID,
      'Invalid address',
    );
  }
}
