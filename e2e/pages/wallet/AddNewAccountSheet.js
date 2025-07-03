import Matchers from '../../framework/Matchers.ts';
import Gestures from '../../framework/Gestures.ts';
import { AddNewAccountIds } from '../../selectors/MultiSRP/AddHdAccount.selectors';

class AddNewAccountSheet {
  get confirmButton() {
    return Matchers.getElementByID(AddNewAccountIds.CONFIRM);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new AddNewAccountSheet();
