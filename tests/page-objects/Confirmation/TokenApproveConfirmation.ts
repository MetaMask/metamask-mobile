import { ApproveComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

// This components are used to check the approve confirmation specific components in the confirmation modal
class TokenApproveConfirmation {
  get SpendingCapValue(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ApproveComponentIDs.SPENDING_CAP_VALUE),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ApproveComponentIDs.SPENDING_CAP_VALUE,
        ),
    });
  }

  get EditSpendingCapButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ApproveComponentIDs.EDIT_SPENDING_CAP_BUTTON,
        ),
    });
  }

  get EditSpendingCapInput(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
        ),
    });
  }

  get EditSpendingCapSaveButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
        ),
    });
  }

  async tapEditSpendingCapButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.EditSpendingCapButton);
  }

  async tapEditSpendingCapSaveButton(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.EditSpendingCapSaveButton, {
      elemDescription:
        'Edit Spending Cap Save Button in Token Approve Confirmation',
    });
  }

  async inputSpendingCap(spendingCap: string): Promise<void> {
    await UnifiedGestures.typeText(this.EditSpendingCapInput, spendingCap, {
      elemDescription: 'Edit Spending Cap Input in Token Approve Confirmation',
      hideKeyboard: true,
    });
  }
}

export default new TokenApproveConfirmation();
