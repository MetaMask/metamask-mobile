import { ApproveComponentIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import { TEXTFIELD_TEST_ID } from '../../../app/component-library/components/Form/TextField/TextField.constants';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  EncapsulatedElementType,
  asPlaywrightElement,
  encapsulated,
  encapsulatedAction,
  PlatformDetector,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../../framework';

/** Modal title — tap to dismiss number pad without hitting the backdrop (cancel). */
const EDIT_SPENDING_CAP_MODAL_TITLE = 'Edit approval limit';

// This components are used to check the approve confirmation specific components in the confirmation modal
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
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT),
      appium: {
        android: () =>
          PlaywrightMatchers.getElementById(
            ApproveComponentIDs.EDIT_SPENDING_CAP_INPUT,
            { exact: true },
          ),
        ios: () =>
          PlaywrightMatchers.getElementById(TEXTFIELD_TEST_ID, {
            exact: true,
          }),
      },
    });
  }

  get EditSpendingCapSaveButton(): EncapsulatedElementType {
    return Matchers.getElementByID(
      ApproveComponentIDs.EDIT_SPENDING_CAP_SAVE_BUTTON,
    );
  }

  async tapEditSpendingCapButton(): Promise<void> {
    await Gestures.waitAndTap(this.EditSpendingCapButton, {
      elemDescription: 'Edit Spending Cap Button in Token Approve Confirmation',
      // iOS BottomSheet children often report isDisplayed=false while visible.
      checkForDisplayed: false,
    });
  }

  async tapEditSpendingCapSaveButton(): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.waitAndTap(this.EditSpendingCapSaveButton, {
          elemDescription:
            'Edit Spending Cap Save Button in Token Approve Confirmation',
        });
      },
      appium: async () => {
        if (PlatformDetector.isIOS()) {
          const title = await PlaywrightMatchers.getElementByText(
            EDIT_SPENDING_CAP_MODAL_TITLE,
          );
          // Blur number pad via modal title (backdrop tap cancels the edit).
          await PlaywrightGestures.waitAndTap(title, {
            checkForDisplayed: false,
          });
        }

        await Gestures.waitAndTap(this.EditSpendingCapSaveButton, {
          elemDescription:
            'Edit Spending Cap Save Button in Token Approve Confirmation',
          checkForDisplayed: false,
        });
      },
    });
  }

  async inputSpendingCap(spendingCap: string): Promise<void> {
    await encapsulatedAction({
      detox: async () => {
        await Gestures.typeText(this.EditSpendingCapInput, spendingCap, {
          elemDescription:
            'Edit Spending Cap Input in Token Approve Confirmation',
          hideKeyboard: true,
        });
      },
      appium: async () => {
        if (PlatformDetector.isIOS()) {
          const input = await asPlaywrightElement(this.EditSpendingCapInput);
          await PlaywrightGestures.waitAndTap(input, {
            checkForDisplayed: false,
          });
          // Burst Delete clears the open edit-modal default on the number pad.
          for (let i = 0; i < 3; i++) {
            await PlaywrightGestures.tapIosKeyboardKey('Delete');
          }
          await PlaywrightGestures.typeViaIosKeyboard(spendingCap, {
            numberPad: true,
          });
          return;
        }

        const el = await asPlaywrightElement(this.EditSpendingCapInput);
        await el.fill(spendingCap);
        await PlaywrightGestures.hideKeyboard();
      },
    });
  }
}

export default new TokenApproveConfirmation();
