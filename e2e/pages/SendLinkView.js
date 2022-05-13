import TestHelpers from '../helpers';

const SEND_LINK_CONTAINER_ID = 'send-link-screen';
const QR_CODE_BUTTON_ID = 'request-qrcode-button';
const QR_MODAL_ID = 'payment-request-qrcode';
const CLOSE_QR_MODAL_BUTTON_ID = 'payment-request-qrcode-close-button';
const CLOSE_SEND_LINK_VIEW_BUTTON_ID = 'send-link-close-button';

export default class SendLinkView {
  static async tapQRCodeButton() {
    await TestHelpers.tap(QR_CODE_BUTTON_ID);
  }

  static async isVisible() {
    await TestHelpers.checkIfVisible(SEND_LINK_CONTAINER_ID);
  }

  static async isNotVisible() {
    await TestHelpers.checkIfNotVisible(SEND_LINK_CONTAINER_ID);
  }
  static async tapCloseSendLinkButton() {
    await TestHelpers.tap(CLOSE_SEND_LINK_VIEW_BUTTON_ID);
  }

  // QR Modal
  static async tapQRCodeCloseButton() {
    await TestHelpers.tap(CLOSE_QR_MODAL_BUTTON_ID);
  }

  static async isQRModalVisible() {
    await TestHelpers.checkIfVisible(QR_MODAL_ID);
  }
}
