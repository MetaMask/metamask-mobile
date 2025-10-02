import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { RedesignedSendViewSelectorsIDs } from '../../selectors/SendFlow/RedesignedSendView.selectors';

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

  get recipientAddressInput(): DetoxElement {
    return Matchers.getElementByID(
      RedesignedSendViewSelectorsIDs.RECIPIENT_ADDRESS_INPUT,
    );
  }

  // get nextButton(): DetoxElement {
  //   return device.getPlatform() === 'ios'
  //     ? Matchers.getElementByID(SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON)
  //     : Matchers.getElementByLabel(
  //         SendViewSelectorsIDs.ADDRESS_BOOK_NEXT_BUTTON,
  //       );
  // }

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

  async inputRecipientAddress(address: string): Promise<void> {
    await Gestures.typeText(this.recipientAddressInput, address, {
      elemDescription: 'Enter recipient address',
    });
  }

  // async tapNextButton(): Promise<void> {
  //   await Gestures.waitAndTap(this.nextButton, {
  //     elemDescription: 'Next Button in Send View',
  //   });
  // }
}

export default new SendView();
