import {
  ConfirmationRowComponentIDs,
  TransactionPayComponentIDs,
} from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import Matchers from '../../framework/Matchers';
import { Assertions, Gestures } from '../../framework';

class TransactionPayConfirmation {
  get bridgeTime(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.BRIDGE_TIME);
  }

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

  get keyboardContinueButton(): DetoxElement {
    return Matchers.getElementByID(
      TransactionPayComponentIDs.KEYBOARD_CONTINUE_BUTTON,
    );
  }

  get total(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TOTAL);
  }

  get transactionFee(): DetoxElement {
    return Matchers.getElementByID(ConfirmationRowComponentIDs.TRANSACTION_FEE);
  }

  async tapPayWithRow(): Promise<void> {
    await Gestures.waitAndTap(this.payWithRow, {
      elemDescription: 'Pay With Row',
    });
  }

  async tapPayWithToken(tokenSymbol: string): Promise<void> {
    await Gestures.waitAndTap(Matchers.getElementByText(tokenSymbol), {
      elemDescription: `Pay With Token ${tokenSymbol}`,
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

  async verifyBridgeTime(time: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.bridgeTime, time, {
      description: 'Bridge time should be correct',
    });
  }

  async verifyTotal(total: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.total, total, {
      description: 'Total should be correct',
    });
  }

  async verifyTransactionFee(fee: string): Promise<void> {
    await Assertions.expectElementToHaveText(this.transactionFee, fee, {
      description: 'Transaction fee should be correct',
    });
  }
}

export default new TransactionPayConfirmation();
