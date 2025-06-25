import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
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
