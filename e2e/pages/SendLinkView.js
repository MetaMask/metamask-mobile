import TestHelpers from '../helpers';
import { SendLinkViewSelectorsIDs } from '../selectors/SendLinkView.selectors';

export default class SendLinkView {
  static async tapQRCodeButton() {
    if (device.getPlatform() === 'android') {
      await TestHelpers.waitAndTapByLabel(
        SendLinkViewSelectorsIDs.QR_CODE_BUTTON,
      );
    } else {
      await TestHelpers.tap(SendLinkViewSelectorsIDs.QR_CODE_BUTTON);
    }
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }
  static async tapCloseSendLinkButton() {
    await TestHelpers.tap(SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON);
  }

  // QR Modal
  static async tapQRCodeCloseButton() {
    await TestHelpers.tap(SendLinkViewSelectorsIDs.CLOSE_QR_MODAL_BUTTON);
  }

  static async isQRModalVisible() {
    await TestHelpers.checkIfVisible(SendLinkViewSelectorsIDs.QR_MODAL);
  }
}
