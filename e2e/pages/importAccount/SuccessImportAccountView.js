import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { SuccessImportAccountIDs } from '../../selectors/ImportAccount/SuccessImportAccount.selectors';

class SuccessImportAccountView {
  get container() {
    return Matchers.getElementByID(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton() {
    return Matchers.getElementByID(SuccessImportAccountIDs.CLOSE_BUTTON);
  }

  async tapCloseButton() {
    await Gestures.waitAndTap(this.closeButton);
  }
}

export default new SuccessImportAccountView();
