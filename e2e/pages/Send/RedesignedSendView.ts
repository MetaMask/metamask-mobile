import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers';
import { RedesignedSendViewSelectorsIDs } from '../../../app/components/Views/confirmations/components/send/RedesignedSendView.testIds';
import { Utilities } from '../../framework';

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
    await TestHelpers.delay(2000);
    await Gestures.waitAndTap(this.reviewButton, {
      elemDescription: 'Review button',
    });
  }
}

export default new SendView();
