import Matchers from '../utils/Matchers';
import Gestures from '../utils/Gestures';
import { SendLinkViewSelectorsIDs } from '../selectors/SendLinkView.selectors';

class SendLinkView {
  get container() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }

  get qrModal() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get qrCloseButton() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CLOSE_QR_MODAL_BUTTON);
  }

  get closeSendLinkButton() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON);
  }

  get qrCodeButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SendLinkViewSelectorsIDs.QR_CODE_BUTTON)
      : Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_CODE_BUTTON);
  }

  async tapQRCodeButton() {
    await Gestures.waitAndTap(this.qrCodeButton);
  }

  async tapCloseSendLinkButton() {
    await Gestures.waitAndTap(this.closeSendLinkButton);
  }

  // QR Modal
  async tapQRCodeCloseButton() {
    await Gestures.waitAndTap(this.qrCloseButton);
  }
}

export default new SendLinkView();
