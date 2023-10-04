import TestHelpers from '../../helpers';

const REQUEST_PAYMENT_CONTAINER_ID = 'receive-request-screen';
const REQUEST_BUTTON_ID = 'request-payment-button';
const PUBLIC_ADDRESS_ID = 'account-address';

export default class RequestPaymentModal {
  static async tapRequestPaymentButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(REQUEST_BUTTON_ID);
    } else {
      await TestHelpers.tap(REQUEST_BUTTON_ID);
    }
  }

  static async closeRequestModal() {
    if (device.getPlatform() === 'android') {
      // Close modal
      await device.pressBack();
      await TestHelpers.delay(1000);
    } else {
      // Close modal
      await TestHelpers.swipe(REQUEST_PAYMENT_CONTAINER_ID, 'down');
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(REQUEST_PAYMENT_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(REQUEST_PAYMENT_CONTAINER_ID);
  }
  static async isPublicAddressCorrect(publicAddress) {
    await TestHelpers.checkIfElementHasString(PUBLIC_ADDRESS_ID, publicAddress);
  }
}
