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

  async tapReviewButton(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.reviewButton, {
      timeout,
      description: 'tap Review button on withdraw input',
    });
  }

  async tapWithdraw(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.withdrawButton, {
      timeout,
      description: 'tap Withdraw button on lending balance',
    });
  }

  async tapDeposit(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.depositButton, {
      timeout,
      description: 'tap Deposit button on lending balance',
    });
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await Gestures.waitAndTap(this.confirmButton, {
      timeout,
      description: 'tap Confirm button on lending confirmation',
    });
  }

  async tapCancel(): Promise<void> {
    await Gestures.waitAndTap(this.cancelButton, {
      description: 'tap Cancel button on lending confirmation',
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
            description: 'tap Confirm button (retry loop)',
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
