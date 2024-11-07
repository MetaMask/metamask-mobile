import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import { SendLinkViewSelectorsIDs } from '../../e2e/selectors/Receive/SendLinkView.selectors';

class SendLinkScreen {
  get requestCloseButton() {
    return Selectors.getElementByPlatform(SendLinkViewSelectorsIDs.CLOSE_SEND_LINK_VIEW_BUTTON);
  }

  get closeRequestPaymentQRIcon() {
    return Selectors.getElementByPlatform(SendLinkViewSelectorsIDs.CLOSE_QR_MODAL_BUTTON);
  }

  async closePaymentRequest() {
    await Gestures.tap(this.requestCloseButton);
  }

  async closeQRPayment() {
    await Gestures.tap(this.closeRequestPaymentQRIcon);
  }
}

export default new SendLinkScreen();
