import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SendLinkViewSelectorsIDs } from '../../selectors/Receive/SendLinkView.selectors';

type DetoxElement = Promise<Detox.IndexableNativeElement | Detox.NativeElement | Detox.IndexableSystemElement>;

class PaymentRequestQrBottomSheet {
  get container(): DetoxElement {
    return Matchers.getElementByID(SendLinkViewSelectorsIDs.QR_MODAL);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(
      SendLinkViewSelectorsIDs.CLOSE_QR_MODAL_BUTTON,
    );
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new PaymentRequestQrBottomSheet(); 