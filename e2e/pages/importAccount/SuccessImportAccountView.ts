import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { SuccessImportAccountIDs } from '../../selectors/ImportAccount/SuccessImportAccount.selectors';

class SuccessImportAccountView {
  get container(): DetoxElement {
    return Matchers.getElementByID(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton(): DetoxElement {
    return Matchers.getElementByID(SuccessImportAccountIDs.CLOSE_BUTTON);
  }

  async tapCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.closeButton, {
      elemDescription: 'Close button',
    });
  }
}

export default new SuccessImportAccountView();
