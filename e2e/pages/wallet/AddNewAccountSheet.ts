import Matchers from '../../../tests/framework/Matchers';
import Gestures from '../../../tests/framework/Gestures';
import { AddNewAccountIds } from '../../../app/components/Views/AddNewAccount/AddHdAccount.testIds';

class AddNewAccountSheet {
  get confirmButton() {
    return Matchers.getElementByID(AddNewAccountIds.CONFIRM);
  }

  async tapConfirmButton() {
    await Gestures.waitAndTap(this.confirmButton);
  }
}

export default new AddNewAccountSheet();
