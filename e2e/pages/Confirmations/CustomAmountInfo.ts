import { Matchers } from '../../framework';
import Gestures from '../../framework/Gestures';

class CustomAmountInfo {
  get maxButton(): DetoxElement {
    return Matchers.getElementByText('Max');
  }

  get amountInput(): DetoxElement {
    return Matchers.getElementByID('custom-amount-input');
  }

  get doneButton(): DetoxElement {
    return Matchers.getElementByID('deposit-keyboard-done-button');
  }

  async tapMaxButton(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Max percentage button on Custom Amount screen',
    });
  }

  async typeAmountAndDone(amount: string): Promise<void> {
    await Gestures.waitAndTap(this.amountInput, {
      elemDescription: 'Open custom amount keypad',
      checkEnabled: false,
      checkVisibility: false,
    });
    for (const ch of amount) {
      const key = Matchers.getElementByText(ch) as DetoxElement;
      await Gestures.waitAndTap(key, {
        elemDescription: `Keypad: ${ch}`,
        checkEnabled: false,
        checkVisibility: false,
      });
    }
    await Gestures.waitAndTap(this.doneButton, {
      elemDescription: 'Tap Done on deposit keyboard',
    });
  }
}

export default new CustomAmountInfo();
