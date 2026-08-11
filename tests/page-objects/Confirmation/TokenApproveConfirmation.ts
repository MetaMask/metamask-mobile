import { ApproveComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { TEXTFIELD_TEST_ID } from '../../../app/component-library/components/Form/TextField/TextField.constants';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { EncapsulatedElementType, PlatformDetector } from '../../framework';

const EDIT_SPENDING_CAP_MODAL_TITLE = 'Edit approval limit';

class TokenApproveConfirmation {
  get SpendingCapValue(): EncapsulatedElementType {
    return Matchers.getElementByID(ApproveComponentIDs.SPENDING_CAP_VALUE);
  }

  get EditSpendingCapButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_BUTTON,
    );
  }

  get EditSpendingCapInput(): EncapsulatedElementType {
    // iOS exposes the generic TextField id; Android uses the specific input id.
    if (PlatformDetector.isIOS()) {
      return Matchers.getElementByID(TEXTFIELD_TEST_ID);
    }
    return Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT);
  }

  get EditSpendingCapSaveButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
    );
  }

  async tapEditSpendingCapButton(): Promise<void> {
    await Gestures.waitAndTap(this.EditSpendingCapButton, {
      elemDescription: 'Edit Spending Cap Button in Token Approve Confirmation',
      checkForDisplayed: false,
    });
  }

  async tapEditSpendingCapSaveButton(): Promise<void> {
    if (PlatformDetector.isIOS()) {
      const title = Matchers.getElementByText(EDIT_SPENDING_CAP_MODAL_TITLE);
      // Dismiss the number pad by tapping the modal title.
      await Gestures.waitAndTap(title, {
        checkForDisplayed: false,
      });
    }

    await Gestures.waitAndTap(this.EditSpendingCapSaveButton, {
      elemDescription:
        'Edit Spending Cap Save Button in Token Approve Confirmation',
      checkForDisplayed: false,
    });
  }

  async inputSpendingCap(spendingCap: string): Promise<void> {
    await Gestures.typeText(this.EditSpendingCapInput, spendingCap, {
      elemDescription:
        'Edit Spending Cap Input in Token Approve Confirmation',
      hideKeyboard: true,
      clearFirst: true,
    });
  }
}

export default new TokenApproveConfirmation();
