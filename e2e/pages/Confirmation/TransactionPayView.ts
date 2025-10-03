import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../selectors/Confirmation/ConfirmationView.selectors';
import Matchers from '../../framework/Matchers';
import { Gestures } from '../../framework';

class TransactionPayView {
  get payWithRow(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.PAY_WITH);
  }

  get payWithSymbol(): DetoxElement {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_SYMBOL);
  }

  get payWithFiat(): DetoxElement {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_FIAT);
  }

  get payWithBalance(): DetoxElement {
    return Matchers.getElementByID(TransactionPayComponentIDs.PAY_WITH_BALANCE);
  }

  get payWithModalCloseButton(): DetoxElement {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.CLOSE_MODAL_BUTTON,
    );
  }

  get keyboardContinueButton(): DetoxElement {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.KEYBOARD_CONTINUE_BUTTON,
    );
  }

  availableToken(address: string, chainId: string): DetoxElement {
    return Matchers.getElementByID(`available-token-${address}-${chainId}`);
  }

  async tapPayWithRow(): Promise<void> {
    await Gestures.waitAndTap(this.payWithRow, {
      elemDescription: 'Pay With Row',
    });
  }

  async tapPayWithModalCloseButton(): Promise<void> {
    await Gestures.waitAndTap(this.payWithModalCloseButton, {
      elemDescription: 'Pay With Modal Close Button',
    });
  }

  async tapKeyboardContinueButton(): Promise<void> {
    await Gestures.waitAndTap(this.keyboardContinueButton, {
      elemDescription: 'Keyboard Continue Button',
    });
  }

  async tapKeyboardAmount(amount: string): Promise<void> {
    for (const char of amount) {
      await Gestures.waitAndTap(Matchers.getElementByText(char), {
        elemDescription: `Keyboard Key ${char}`,
      });
    }
  }
}

export default new TransactionPayView();
