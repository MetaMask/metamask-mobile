import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import { EarnLendingViewSelectorsText } from '../../selectors/Earn/EarnLendingView.selectors';
import { EARN_LENDING_BALANCE_TEST_IDS } from '../../../app/components/UI/Earn/components/EarnLendingBalance/EarnLendingBalance.testIds';
import {
  CONFIRMATION_FOOTER_TEST_ID,
  CONFIRMATION_FOOTER_BUTTON_TEST_IDS,
} from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/ConfirmationFooter/ConfirmationFooter.testIds';
import { DEPOSIT_DETAILS_SECTION_TEST_ID } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/DepositInfoSection/DepositInfoSection.testIds';
import { DEPOSIT_RECEIVE_SECTION_TEST_ID } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/DepositReceiveSection/DepositReceiveSection.testIds';
import { PROGRESS_STEPPER_TEST_IDS } from '../../../app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/components/ProgressStepper/ProgressStepper.testIds';
import { EarnWithdrawInputViewTestIds } from '../../../app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.testIds';
import { type AppiumElement } from '../../framework';

class EarnLendingView {
  get withdrawButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      EARN_LENDING_BALANCE_TEST_IDS.WITHDRAW_BUTTON,
    );
  }

  get confirmationFooter(): Promise<AppiumElement> {
    return Matchers.getElementByID(CONFIRMATION_FOOTER_TEST_ID);
  }

  get confirmButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CONFIRM_BUTTON,
    );
  }

  get cancelButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(
      CONFIRMATION_FOOTER_BUTTON_TEST_IDS.CANCEL_BUTTON,
    );
  }

  get depositInfoSection(): Promise<AppiumElement> {
    return Matchers.getElementByID(DEPOSIT_DETAILS_SECTION_TEST_ID);
  }

  get depositReceiveSection(): Promise<AppiumElement> {
    return Matchers.getElementByID(DEPOSIT_RECEIVE_SECTION_TEST_ID);
  }

  get progressBar(): Promise<AppiumElement> {
    return Matchers.getElementByID(PROGRESS_STEPPER_TEST_IDS.PROGRESS_BAR);
  }

  get supplyTitle(): Promise<AppiumElement> {
    return Matchers.getElementByText(EarnLendingViewSelectorsText.SUPPLY);
  }

  get reviewButton(): Promise<AppiumElement> {
    return Matchers.getElementByID(EarnWithdrawInputViewTestIds.REVIEW_BUTTON);
  }

  get withdrawalTimeLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(
      EarnLendingViewSelectorsText.WITHDRAWAL_TIME,
    );
  }

  get confirmButtonByLabel(): Promise<AppiumElement> {
    return Matchers.getElementByText(EarnLendingViewSelectorsText.CONFIRM);
  }

  async tapConfirmByLabel(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.confirmButtonByLabel, {
      timeout,
      elemDescription: 'Confirm button (by label) on lending confirmation',
    });
  }

  async tapReviewButton(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton, {
      timeout,
      elemDescription: 'Review button on withdraw input',
    });
  }

  async tapWithdraw(timeout?: number): Promise<void> {
    await this.scrollToWithdrawButton();
    await Gestures.waitAndTap(this.withdrawButton, {
      timeout,
      elemDescription: 'Withdraw button on lending balance',
    });
  }

  async scrollToWithdrawButton(): Promise<void> {
    await Gestures.scrollToElement(
      this.withdrawButton,
      Matchers.scrollContainer('transactions-container'),
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Scroll to Withdraw button',
      },
    );
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'Confirm button on lending confirmation',
    });
  }

  async tapCancel(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      elemDescription: 'Cancel button on lending confirmation',
    });
  }

  async tapConfirmWithRetry(timeout = 60000): Promise<void> {
    await Utilities.executeWithRetry(
      async () => {
        const alreadyGone = !(await Utilities.isElementVisible(
          this.confirmButton,
          2000,
        ));
        if (!alreadyGone) {
          await Gestures.waitAndTap(this.confirmButton, {
            timeout: 5000,
            elemDescription: 'Confirm button (retry loop)',
          });
        }
      },
      {
        timeout,
        description: 'tap Confirm and wait for navigation',
        elemDescription: 'Confirm button on lending confirmation',
      },
    );
  }

  async expectDepositConfirmationVisible(timeout = 30000): Promise<void> {
    await Assertions.expectElementToBeVisible(this.depositInfoSection, {
      timeout,
      description:
        'lending deposit confirmation info section should be visible',
    });
  }

  async expectWithdrawalConfirmationVisible(timeout = 30000): Promise<void> {
    await Assertions.expectTextDisplayed(
      EarnLendingViewSelectorsText.WITHDRAWAL_TIME,
      {
        timeout,
        description:
          'lending withdrawal confirmation should show Withdrawal time label',
      },
    );
  }

  async expectConfirmButtonVisible(timeout?: number): Promise<void> {
    await Assertions.expectElementToBeVisible(this.confirmButton, {
      timeout,
      description: 'lending confirmation Confirm button should be visible',
    });
  }
}

export default new EarnLendingView();
