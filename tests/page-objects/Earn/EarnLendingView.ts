import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import {
  EarnLendingViewSelectorsIDs,
  EarnLendingViewSelectorsText,
} from '../../selectors/Earn/EarnLendingView.selectors';

class EarnLendingView {
  get withdrawButton(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.WITHDRAW_BUTTON);
  }

  get depositButton(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.DEPOSIT_BUTTON);
  }

  get confirmationFooter(): DetoxElement {
    return Matchers.getElementByID(
      EarnLendingViewSelectorsIDs.CONFIRMATION_FOOTER,
    );
  }

  get confirmButton(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.CONFIRM_BUTTON);
  }

  get cancelButton(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.CANCEL_BUTTON);
  }

  get depositInfoSection(): DetoxElement {
    return Matchers.getElementByID(
      EarnLendingViewSelectorsIDs.DEPOSIT_INFO_SECTION,
    );
  }

  get depositReceiveSection(): DetoxElement {
    return Matchers.getElementByID(
      EarnLendingViewSelectorsIDs.DEPOSIT_RECEIVE_SECTION,
    );
  }

  get progressBar(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.PROGRESS_BAR);
  }

  get supplyTitle(): DetoxElement {
    return Matchers.getElementByText(EarnLendingViewSelectorsText.SUPPLY);
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByID(EarnLendingViewSelectorsIDs.REVIEW_BUTTON);
  }

  get withdrawalTimeLabel(): DetoxElement {
    return Matchers.getElementByText(
      EarnLendingViewSelectorsText.WITHDRAWAL_TIME,
    );
  }

  get confirmButtonByLabel(): DetoxElement {
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
      Matchers.getIdentifier('transactions-container'),
      {
        direction: 'down',
        scrollAmount: 200,
        elemDescription: 'Scroll to Withdraw button',
      },
    );
  }

  async tapDeposit(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.depositButton, {
      timeout,
      elemDescription: 'Deposit button on lending balance',
    });
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
