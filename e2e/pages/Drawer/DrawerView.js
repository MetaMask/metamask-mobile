import TestHelpers from '../../helpers';

const ACCOUNT_CARET_BUTTON_ID = 'navbar-account-button';
const ADD_FUNDS_BUTTON_ID = 'drawer-receive-button';
const DRAWER_CONTAINER_ID = 'drawer-screen';
const SEND_BUTTON_ID = 'drawer-send-button';
export default class DrawerView {
  static async tapSettings() {
    await TestHelpers.tapByText('Settings');
  }

  static async tapTransactions() {
    await TestHelpers.tapByText('Transactions');
  }
  static async tapLockAccount() {
    await TestHelpers.tapByText('Lock');
  }

  static async tapYesAlertButton() {
    await TestHelpers.tapAlertWithButton('YES'); // Do you really want to log out modal
  }

  static async tapAccountCaretButton() {
    await TestHelpers.waitAndTap(ACCOUNT_CARET_BUTTON_ID);
  }
  static async closeDrawer() {
    if (device.getPlatform() === 'android') {
      await device.pressBack();
      await TestHelpers.delay(1000);
    } else {
      // Close drawer
      await TestHelpers.swipe(DRAWER_CONTAINER_ID, 'left');
    }
  }

  static async tapSendButton() {
    await TestHelpers.tap(SEND_BUTTON_ID);
  }

  static async tapOnAddFundsButton() {
    await TestHelpers.tap(ADD_FUNDS_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(DRAWER_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(DRAWER_CONTAINER_ID);
  }
}
