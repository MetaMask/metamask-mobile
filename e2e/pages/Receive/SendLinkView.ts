import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SendLinkViewSelectorsIDs } from '../../selectors/Receive/SendLinkView.selectors';

class SendLinkView {
  get container(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }

  get qrModal(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get closeSendLinkButton(): TappableElement {
    return Matchers.getElementByID(
      SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON,
    ) as TappableElement;
  }

  get qrCodeButton(): TappableElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SendLinkViewSelectorsIDs.QR_CODE_BUTTON)
      : Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_CODE_BUTTON);
  }

  async tapQRCodeButton(): Promise<void> {
    await Gestures.waitAndTap(this.qrCodeButton);
  }

  async tapCloseSendLinkButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeSendLinkButton);
  }
}

export default new SendLinkView();
