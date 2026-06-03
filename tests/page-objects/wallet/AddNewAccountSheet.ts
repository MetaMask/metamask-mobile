import Matchers from '../../framework/Matchers';
import { AddNewAccountIds } from '../../../app/components/Views/AddNewAccount/AddHdAccount.testIds';
import UnifiedGestures from '../../framework/UnifiedGestures';

class AddNewAccountSheet {
  get confirmButton() {
    return Matchers.getElementByID(AddNewAccountIds.CONFIRM);
  }

  async tapConfirmButton() {
    await UnifiedGestures.waitAndTap(this.confirmButton);
  }
}

export default new AddNewAccountSheet();
