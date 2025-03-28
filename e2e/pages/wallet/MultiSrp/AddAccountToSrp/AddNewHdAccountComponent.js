import { AddNewHdAccountIds } from '../../../../selectors/MultiSRP/AddHdAccount.selectors';
import Matchers from '../../../../utils/Matchers';
import Gestures from '../../../../utils/Gestures';

class AddNewHdAccountComponent {
  get container() {
    return Matchers.getElementByID(AddNewHdAccountIds.CONTAINER);
  }

  get srpSelector() {
    return Matchers.getElementByID(AddNewHdAccountIds.SRP_SELECTOR);
  }

  get cancelButton() {
    return Matchers.getElementByID(AddNewHdAccountIds.CANCEL);
  }

  get confirmButton() {
    return Matchers.getElementByID(AddNewHdAccountIds.CONFIRM);
  }

  get nameInput() {
    return Matchers.getElementByID(AddNewHdAccountIds.NAME_INPUT);
  }

  async tapSrpSelector() {
    await Gestures.waitAndTap(this.srpSelector);
  }

  async tapCancel() {
    await Gestures.waitAndTap(this.cancelButton);
  }

  async tapConfirm() {
    await Gestures.waitAndTap(this.confirmButton);
  }

  async enterName(accountName) {
    await Gestures.clearField(this.nameInput);
    await Gestures.typeTextAndHideKeyboard(this.nameInput, accountName);
  }
}

export default new AddNewHdAccountComponent();
