import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';

class SendView {
  get ethereumTokenButton(): DetoxElement {
    return Matchers.getElementByText('Ethereum');
  }

  get amountFiveButton(): DetoxElement {
    return Matchers.getElementByText('5');
  }

  get continueButton(): DetoxElement {
    return Matchers.getElementByText('Continue');
  }

  async selectEthereumToken(): Promise<void> {
    await Gestures.waitAndTap(this.ethereumTokenButton, {
      elemDescription: 'Select ethereum token',
    });
  }

  async pressAmountFiveButton(): Promise<void> {
    await Gestures.waitAndTap(this.amountFiveButton, {
      elemDescription: 'Amount 5',
    });
  }

  async pressContinueButton() {
    await Gestures.waitAndTap(this.continueButton, {
      elemDescription: 'Continue button',
    });
  }
}

export default new SendView();
