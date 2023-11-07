import TestHelpers from '../../helpers';
import { RequestPaymentModalSelectorsIDs } from '../../selectors/Modals/RequestPaymentModal.selectors';

export default class RequestPaymentModal {
  static async tapRequestPaymentButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        RequestPaymentModalSelectorsIDs.REQUEST_BUTTON,
      );
    } else {
      await TestHelpers.tap(RequestPaymentModalSelectorsIDs.REQUEST_BUTTON);
    }
  }

  static async closeRequestModal() {
    if (device.getPlatform() === 'android') {
      // Close modal
      await device.pressBack();
      await TestHelpers.delay(1000);
    } else {
      // Close modal
      await TestHelpers.swipe(
        RequestPaymentModalSelectorsIDs.CONTAINER,
        'down',
      );
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(RequestPaymentModalSelectorsIDs.CONTAINER);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(
      RequestPaymentModalSelectorsIDs.CONTAINER,
    );
  }
}
