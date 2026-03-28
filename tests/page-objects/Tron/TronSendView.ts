import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import SendView from '../Send/RedesignedSendView';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';

class TronSendView {
  get addressInput(): DetoxElement {
    return SendView.recipientAddressInput;
  }

  get amountInput(): DetoxElement {
    return SendView.amountInputField;
  }

  get continueButton(): DetoxElement {
    return SendView.continueButton;
  }

  get reviewButton(): DetoxElement {
    return SendView.reviewButton;
  }

  get sendAmountScreen(): DetoxElement {
    return Matchers.getElementByID(RedesignedSendViewSelectorsIDs.SEND_AMOUNT);
  }

  async fillRecipient(address: string): Promise<void> {
    await SendView.inputRecipientAddress(address);
  }

  async fillAmount(amount: string): Promise<void> {
    await SendView.typeInTransactionAmount(amount);
  }

  async checkAmountScreenVisible(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.sendAmountScreen, {
      description: 'Tron amount screen should be visible',
    });
  }

  async tapContinue(): Promise<void> {
    await SendView.pressContinueButton();
  }

  async tapReview(): Promise<void> {
    await SendView.pressReviewButton();
  }

  async tapConfirm(): Promise<void> {
    await this.tapReview();
  }

  async checkFeeIsDisplayed(): Promise<void> {
    await Assertions.expectElementToBeVisible(this.reviewButton, {
      description: 'Review button should be visible on Tron send flow',
    });
  }

  async checkInsufficientFundsError(): Promise<void> {
    await SendView.checkInsufficientFundsError();
  }

  async checkInvalidAddressError(): Promise<void> {
    await Assertions.expectElementToHaveText(
      this.reviewButton,
      'Invalid address',
    );
  }
}

export default new TronSendView();
