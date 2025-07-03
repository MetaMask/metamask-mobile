import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { SuccessImportAccountIDs } from '../../selectors/ImportAccount/SuccessImportAccount.selectors';

class SuccessImportAccountView {
  get container() {
    return Matchers.getElementByID(SuccessImportAccountIDs.CONTAINER);
  }

  get closeButton() {
    return Matchers.getElementByID(SuccessImportAccountIDs.CLOSE_BUTTON);
  }

  async tapCloseButton() {
    await Gestures.tap(this.closeButton,
    {
      elemDescription: 'Close button on Success Import Account View',
    },
  );
  }
}

export default new SuccessImportAccountView();
