import Gestures from '../../../tests/framework/Gestures';
import Matchers from '../../../tests/framework/Matchers';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { Utilities, Assertions } from '../../../tests/framework';
import { CommonSelectorsIDs } from '../../../app/util/Common.testIds';
import { SendActionViewSelectorsIDs } from '../../selectors/SendFlow/SendActionView.selectors';

class SendView {
  get ethereumTokenButton(): DetoxElement {
    return Matchers.getElementByText('Ethereum');
  }

  get erc20TokenButton(): DetoxElement {
    return Matchers.getElementByText('USD Coin');
  }

  get zeroButton(): DetoxElement {
    return Matchers.getElementByText('0', 1);
  }

  get amountFiveButton(): DetoxElement {
    return Matchers.getElementByText('5');
  }

  get fiftyPercentButton(): DetoxElement {
    return Matchers.getElementByID('percentage-button-50');
  }

  get maxButton(): DetoxElement {
    return Matchers.getElementByID('percentage-button-100');
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  get recipientAddressInput(): DetoxElement {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
    );
  }

  get reviewButton(): DetoxElement {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.REVIEW_BUTTON,
    );
  }

  get amountInputField(): DetoxElement {
    return Matchers.getElementByID('txn-amount-input');
  }

  get nextButton(): DetoxElement {
    return Matchers.getElementByID('txn-amount-next-button');
  }

  get currencySwitch(): DetoxElement {
    return Matchers.getElementByID('amount-screen-currency-switch');
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(CommonSelectorsIDs.BACK_ARROW_BUTTON);
  }

  get insufficientBalanceToCoverFeesError(): DetoxElement {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_BALANCE_TO_COVER_FEES_ERROR,
    );
  }

  get insufficientFundsError(): DetoxElement {
    return Matchers.getElementByText(
      SendActionViewSelectorsIDs.INSUFFICIENT_FUNDS_ERROR,
    );
  }

  async selectEthereumToken(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumTokenButton, {
      elemDescription: 'Select ethereum token',
    });
  }

  async selectERC20Token(): Promise<void> {
    await Gestures.waitAndTap(this.erc20TokenButton, {
      elemDescription: 'Select ERC20 token',
    });
  }

  async enterZeroAmount(): Promise<void> {
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
  }

  async pressAmountFiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.amountFiveButton, {
      elemDescription: 'Amount 5',
    });
  }

  async pressFiftyPercentButton(): Promise<void> {
    await Gestures.waitAndTap(this.fiftyPercentButton, {
      elemDescription: 'Amount 50%',
    });
  }

  async pressAmountMaxButton(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Amount Max',
    });
  }

  async pressContinueButton() {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue button',
    });
  }

  async inputRecipientAddress(address: string): Promise<void> {
    await Gestures.typeText(this.recipientAddressInput, address, {
      elemDescription: 'Enter recipient address',
      hideKeyboard: true,
    });
  }

  async pressReviewButton() {
    await Utilities.waitForElementToBeEnabled(this.reviewButton);
    await Gestures.waitAndTap(this.reviewButton, {
      elemDescription: 'Review button',
    });
  }

  async typeInTransactionAmount(amount: string): Promise<void> {
    await Gestures.replaceText(this.amountInputField, amount, {
      elemDescription: 'Amount Input Field',
    });
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button on Amount Screen',
    });
  }

  async tapCurrencySwitch(): Promise<void> {
    await Gestures.waitAndTap(this.currencySwitch, {
      elemDescription: 'Currency Switch',
    });
  }

  async tapMaxButton(): Promise<void> {
    await this.pressAmountMaxButton();
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button',
    });
  }

  async checkInsufficientBalanceToCoverFeesError(): Promise<void> {
    await Assertions.expectElementToBeVisible(
      this.insufficientBalanceToCoverFeesError,
      { description: 'Insufficient balance to cover fees error message' },
    );
  }

  async checkInsufficientFundsError(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.insufficientFundsError, {
      description: 'Insufficient funds error message',
    });
  }
}

export default new SendView();
