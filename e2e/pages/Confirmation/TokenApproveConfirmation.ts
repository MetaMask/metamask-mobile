import { ApproveComponentIDs } from '../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';

// This components are used to check the approve confirmation specific components in the confirmation modal
class TokenApproveConfirmation {
  get SpendingCapValue() {
    return Matchers.getElementByID(ApproveComponentIDs.SPENDING_CAP_VALUE);
  }

  get EditSpendingCapButton() {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_BUTTON,
    );
  }

  get EditSpendingCapInput() {
    return Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
  }

  get EditSpendingCapSaveButton() {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
    );
  }

  async tapEditSpendingCapButton() {
    await Gestures.waitAndTap(this.EditSpendingCapButton);
  }

  async tapEditSpendingCapSaveButton() {
    await Gestures.waitAndTap(this.EditSpendingCapSaveButton, { delayBeforeTap: 1000 });
  }

  async inputSpendingCap(spendingCap: string) {
    await Gestures.typeTextAndHideKeyboard(this.EditSpendingCapInput, spendingCap);
  }
}

export default new TokenApproveConfirmation();
