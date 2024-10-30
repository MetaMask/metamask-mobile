import { RequestPaymentBottomSheetSelectorsIDs } from '../../selectors/Receive/RequestPaymentBottomSheet.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

class RequestPaymentBottomSheet {
  get requestPaymentButton() {
    return device.getPlatform() === 'android'
      ? Matchers.getElementByLabel(
        RequestPaymentBottomSheetSelectorsIDs.REQUEST_BUTTON,
        )
      : Matchers.getElementByID(RequestPaymentBottomSheetSelectorsIDs.REQUEST_BUTTON);
  }

  async tapRequestPaymentButton() {
    await Gestures.waitAndTap(this.requestPaymentButton);
  }
}

export default new RequestPaymentBottomSheet();
