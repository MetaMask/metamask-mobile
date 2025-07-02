import { AddNewAccountIds } from '../../../../selectors/MultiSRP/AddHdAccount.selectors';
import Matchers from '../../../../framework/Matchers.ts';
import Gestures from '../../../../framework/Gestures.ts';
import { IndexableNativeElement } from 'detox/detox';

class AddNewHdAccountComponent {
  get container() {
    return Matchers.getElementByID(AddNewAccountIds.CONTAINER);
  }

  get srpSelector() {
    return Matchers.getElementByID(AddNewAccountIds.SRP_SELECTOR);
  }

  get cancelButton() {
    return Matchers.getElementByID(AddNewAccountIds.CANCEL);
  }

  get confirmButton() {
    return Matchers.getElementByID(AddNewAccountIds.CONFIRM);
  }

  get nameInput() {
    return Matchers.getElementByID(AddNewAccountIds.NAME_INPUT);
  }

  async tapSrpSelector() {
    await Gestures.waitAndTap(this.srpSelector);
  }

  async tapCancel() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapConfirm() {
    await Gestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Add New HD Account - Confirm Button',
      checkStability: true,
    });
  }

  async enterName(accountName: string) {
    await Gestures.typeText(
      this.nameInput as Promise<IndexableNativeElement>,
      accountName,
      {
        elemDescription: 'Add New HD Account - Name Input',
        hideKeyboard: true,
      }
    );
  }
}

export default new AddNewHdAccountComponent();
