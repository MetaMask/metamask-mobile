import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { SendLinkViewSelectorsIDs } from '../../../app/components/UI/ReceiveRequest/SendLinkView.testIds';

class SendLinkView {
  get container(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.CONTAINER_ID);
  }

  get qrModal(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get closeSendLinkButton(): DetoxElement {
    return Matchers.getElementByID(
      SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON,
    );
  }

  get qrCodeButton(): DetoxElement {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(SendLinkViewSelectorsIDs.QR_CODE_BUTTON)
      : Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_CODE_BUTTON);
  }

  async tapQRCodeButton(): Promise<void> {
    await Gestures.waitAndTap(this.qrCodeButton, {
      elemDescription: 'QR Code Button in Send Link View',
    });
  }

  async tapCloseSendLinkButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeSendLinkButton, {
      elemDescription: 'Close Send Link Button in Send Link View',
    });
  }
}

export default new SendLinkView();
