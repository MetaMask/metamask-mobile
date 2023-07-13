import TestHelpers from '../../../../helpers';

import { BACK_ARROW_BUTTON_ID } from '../../../../../app/constants/test-ids';
import { EDIT_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Common.testIds';
import {
  ADD_CONTACT_ADD_BUTTON,
  ADD_CONTACT_ADDRESS_INPUT,
  ADD_CONTACT_DELETE_BUTTON,
  ADD_CONTACT_MEMO_INPUT,
  ADD_CONTACT_NAME_INPUT,
  ADD_CONTACTS_CONTAINER_ID,
} from '../../../../../wdio/screen-objects/testIDs/Screens/AddContact.testIds';
import { DELETE_CONTACT_MODAL_DELETE_BUTTON } from '../../../../../wdio/screen-objects/testIDs/Components/DeleteContactModal.testIds';

const ERROR_MESSAGE_LABEL_ID = 'error-message-warning';

export default class AddContactView {
  static async tapAddContactButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(ADD_CONTACT_ADD_BUTTON);
      await TestHelpers.delay(700);
    } else {
      await TestHelpers.waitAndTap(ADD_CONTACT_ADD_BUTTON);
    }
  }

  static async tapEditButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel('Edit');
    } else {
      await TestHelpers.waitAndTap(EDIT_BUTTON);
    }
  }

  static async tapEditContactCTA() {
    await TestHelpers.waitAndTapByLabel('Edit contact'); // edit CTA button after you make changes to a contact
  }

  static async tapBackButton() {
    await TestHelpers.waitAndTap(BACK_ARROW_BUTTON_ID);
  }

  static async tapDeleteContactCTA() {
    if (device.getPlatform() === 'ios') {
      await TestHelpers.waitAndTap(ADD_CONTACT_DELETE_BUTTON);
      await TestHelpers.tapByText(DELETE_CONTACT_MODAL_DELETE_BUTTON, 1);
    } else {
      await TestHelpers.waitAndTapByLabel(ADD_CONTACT_DELETE_BUTTON);
      await TestHelpers.waitAndTapByLabel(DELETE_CONTACT_MODAL_DELETE_BUTTON);
    }
  }

  static async typeInName(name) {
    if (device.getPlatform() === 'android') {
      await TestHelpers.replaceTextInField(ADD_CONTACT_NAME_INPUT, name);
      await element(by.id(ADD_CONTACT_NAME_INPUT)).tapReturnKey();
    } else {
      await TestHelpers.replaceTextInField(ADD_CONTACT_NAME_INPUT, name);
    }
  }

  static async typeInMemo(memo) {
    await TestHelpers.replaceTextInField(ADD_CONTACT_MEMO_INPUT, memo);
  }

  static async typeInAddress(address) {
    await TestHelpers.replaceTextInField(ADD_CONTACT_ADDRESS_INPUT, address);
  }

  static async clearAddressInputBox() {
    await TestHelpers.clearField(ADD_CONTACT_ADDRESS_INPUT);
  }

  // Assertions

  static async isVisible() {
    await TestHelpers.checkIfVisible(ADD_CONTACTS_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(ADD_CONTACTS_CONTAINER_ID);
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
