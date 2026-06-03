import Matchers from '../../framework/Matchers';
import Assertions from '../../framework/Assertions';
import Utilities from '../../framework/Utilities';
import {
  EarnLendingViewSelectorsIDs,
  EarnLendingViewSelectorsText,
} from '../../selectors/Earn/EarnLendingView.selectors';
import {
  encapsulated,
  EncapsulatedElementType,
} from '../../framework/EncapsulatedElement';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import UnifiedGestures from '../../framework/UnifiedGestures';

class EarnLendingView {
  get withdrawButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.WITHDRAW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.WITHDRAW_BUTTON,
        ),
    });
  }

  get depositButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.DEPOSIT_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.DEPOSIT_BUTTON,
        ),
    });
  }

  get confirmationFooter(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EarnLendingViewSelectorsIDs.CONFIRMATION_FOOTER,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.CONFIRMATION_FOOTER,
        ),
    });
  }

  get confirmButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.CONFIRM_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.CONFIRM_BUTTON,
        ),
    });
  }

  get cancelButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.CANCEL_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.CANCEL_BUTTON,
        ),
    });
  }

  get depositInfoSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EarnLendingViewSelectorsIDs.DEPOSIT_INFO_SECTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.DEPOSIT_INFO_SECTION,
        ),
    });
  }

  get depositReceiveSection(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(
          EarnLendingViewSelectorsIDs.DEPOSIT_RECEIVE_SECTION,
        ),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.DEPOSIT_RECEIVE_SECTION,
        ),
    });
  }

  get progressBar(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.PROGRESS_BAR),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.PROGRESS_BAR,
        ),
    });
  }

  get supplyTitle(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EarnLendingViewSelectorsText.SUPPLY),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EarnLendingViewSelectorsText.SUPPLY,
        ),
    });
  }

  get reviewButton(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByID(EarnLendingViewSelectorsIDs.REVIEW_BUTTON),
      appium: () =>
        PlaywrightMatchers.getElementById(
          EarnLendingViewSelectorsIDs.REVIEW_BUTTON,
        ),
    });
  }

  get withdrawalTimeLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EarnLendingViewSelectorsText.WITHDRAWAL_TIME),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EarnLendingViewSelectorsText.WITHDRAWAL_TIME,
        ),
    });
  }

  get confirmButtonByLabel(): EncapsulatedElementType {
    return encapsulated({
      detox: () =>
        Matchers.getElementByText(EarnLendingViewSelectorsText.CONFIRM),
      appium: () =>
        PlaywrightMatchers.getElementByText(
          EarnLendingViewSelectorsText.CONFIRM,
        ),
    });
  }

  async tapConfirmByLabel(timeout?: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButtonByLabel, {
      timeout,
      elemDescription: 'Confirm button (by label) on lending confirmation',
    });
  }

  async tapReviewButton(timeout?: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.reviewButton, {
      timeout,
      elemDescription: 'Review button on withdraw input',
    });
  }

  async tapWithdraw(timeout?: number): Promise<void> {
    await this.scrollToWithdrawButton();
    await UnifiedGestures.waitAndTap(this.withdrawButton, {
      timeout,
      elemDescription: 'Withdraw button on lending balance',
    });
  }

  async scrollToWithdrawButton(): Promise<void> {
    await UnifiedGestures.scrollToElement(
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
    await UnifiedGestures.waitAndTap(this.depositButton, {
      timeout,
      elemDescription: 'Deposit button on lending balance',
    });
  }

  async tapConfirm(timeout?: number): Promise<void> {
    await UnifiedGestures.waitAndTap(this.confirmButton, {
      timeout,
      elemDescription: 'Confirm button on lending confirmation',
    });
  }

  async tapCancel(): Promise<void> {
    await UnifiedGestures.waitAndTap(this.cancelButton, {
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
          await UnifiedGestures.waitAndTap(this.confirmButton, {
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
