import { AddNewAccountIds } from '../../../../../app/components/Views/AddNewAccount/AddHdAccount.testIds';
import Matchers from '../../../../framework/Matchers';
import { IndexableNativeElement } from 'detox/detox';
import UnifiedGestures from '../../../../framework/UnifiedGestures';

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
    await UnifiedGestures.waitAndTap(this.srpSelector);
  }

  async tapCancel() {
    await UnifiedGestures.waitAndTap(this.cancelButton);
  }

  async tapConfirm() {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      elemDescription: 'Confirm button on Add New HD Account screen',
    });
  }

  async enterName(accountName: string) {
    await UnifiedGestures.typeText(
      this.nameInput as Promise<IndexableNativeElement>,
      accountName,
      {
        elemDescription: 'Account name input field',
        clearFirst: true,
        hideKeyboard: true,
        delay: 2000,
      },
    );
  }
}

export default new AddNewHdAccountComponent();
