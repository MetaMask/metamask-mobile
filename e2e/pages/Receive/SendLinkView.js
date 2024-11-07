import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SendLinkViewSelectorsIDs } from '../../selectors/Receive/SendLinkView.selectors';

class SendLinkView {
  get container() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }

  get qrModal() {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get closeSendLinkButton() {
    return Matchers.getElementByID(
      SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON,
    );
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
}

export default new SendLinkView();
