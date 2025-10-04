import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import TestHelpers from '../../helpers';
import { RedesignedSendViewSelectorsIDs } from '../../selectors/SendFlow/RedesignedSendView.selectors';
import { Utilities } from '../../framework';

class SendView {
  get ethereumTokenButton(): DetoxElement {
    return Matchers.getElementByText('Ethereum');
  }

  get solanaTokenButton(): DetoxElement {
    return Matchers.getElementByText('SOL');
  }

  get erc20TokenButton(): DetoxElement {
    return Matchers.getElementByText('USD Coin');
  }

  get dotButton(): DetoxElement {
    return Matchers.getElementByText('.');
  }

  get zeroButton(): DetoxElement {
    return Matchers.getElementByText('0');
  }

  get amountFiveButton(): DetoxElement {
    return Matchers.getElementByText('5');
  }

  get fiftyPercentButton(): DetoxElement {
    return Matchers.getElementByText('50%');
  }

  get maxButton(): DetoxElement {
    return Matchers.getElementByText('Max');
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

  async selectSolanaToken(): Promise<void> {
    await Gestures.waitAndTap(this.solanaTokenButton, {
      elemDescription: 'Select ethereum token',
    });
  }

  async selectERC20Token(): Promise<void> {
    await Gestures.waitAndTap(this.erc20TokenButton, {
      elemDescription: 'Select ERC20 token',
    });
  }

  async enterSmallAmount(): Promise<void> {
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
    await Gestures.waitAndTap(this.dotButton, {
      elemDescription: '. button',
    });
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
    await Gestures.waitAndTap(this.zeroButton, {
      elemDescription: '0 button',
    });
    await Gestures.waitAndTap(this.amountFiveButton, {
      elemDescription: '5 button',
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
