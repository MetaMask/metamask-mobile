import Selectors from '../helpers/Selectors';
import Gestures from '../helpers/Gestures';
import {
  PAYMENT_REQUEST_CLOSE_BUTTON,
  PAYMENT_REQUEST_QR_CODE_CLOSE_ICON,
} from './testIDs/Screens/RequestToken.testIds';

class SendLinkScreen {
  get requestCloseButton() {
    return Selectors.getElementByPlatform(PAYMENT_REQUEST_CLOSE_BUTTON);
  }

  get closeRequestPaymentQRIcon() {
    return Selectors.getElementByPlatform(PAYMENT_REQUEST_QR_CODE_CLOSE_ICON);
  }

  async closePaymentRequest() {
    await Gestures.tap(this.requestCloseButton);
  }

  async closeQRPayment() {
    await Gestures.tap(this.closeRequestPaymentQRIcon);
  }
}

export default new SendLinkScreen();
