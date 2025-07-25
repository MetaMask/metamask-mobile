import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { AddNewAccountIds } from '../../selectors/MultiSRP/AddHdAccount.selectors';

class AddNewAccountSheet {
  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(AddNewAccountIds.CONFIRM);
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm Button in Add New Account Sheet',
    });
  }
}

export default new AddNewAccountSheet();
