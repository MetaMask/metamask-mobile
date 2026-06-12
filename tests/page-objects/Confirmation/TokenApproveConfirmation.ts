import { ApproveComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';

// This components are used to check the approve confirmation specific components in the confirmation modal
class TokenApproveConfirmation {
  get SpendingCapValue(): DetoxElement {
    return Matchers.getElementByID(ApproveComponentIDs.SPENDING_CAP_VALUE);
  }

  get EditSpendingCapButton(): DetoxElement {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_BUTTON,
    );
  }

  get EditSpendingCapInput(): DetoxElement {
    return Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
  }

  get EditSpendingCapSaveButton(): DetoxElement {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
    );
  }

  async tapEditSpendingCapButton(): Promise<void> {
    await Gestures.waitAndTap(this.EditSpendingCapButton);
  }

  async tapEditSpendingCapSaveButton(): Promise<void> {
    await Gestures.waitAndTap(this.EditSpendingCapSaveButton, {
      elemDescription:
        'Edit Spending Cap Save Button in Token Approve Confirmation',
    });
  }

  async inputSpendingCap(spendingCap: string): Promise<void> {
    await Gestures.typeText(this.EditSpendingCapInput, spendingCap, {
      elemDescription: 'Edit Spending Cap Input in Token Approve Confirmation',
      hideKeyboard: true,
    });
  }
}

export default new TokenApproveConfirmation();
