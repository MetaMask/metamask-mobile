import Assertions from '../../framework/Assertions';
import { Matchers } from '../../framework';
import Gestures from '../../framework/Gestures';
import { PredictWithdrawSelectorsIDs } from '../../selectors/Predict/Predict.selectors';

class CustomAmountInfo {
  get tenPercentButton(): DetoxElement {
    return Matchers.getElementByText(
      PredictWithdrawSelectorsIDs.TEN_PERCENT_TEXT,
    );
  }

  get twentyFivePercentButton(): DetoxElement {
    return Matchers.getElementByText(
      PredictWithdrawSelectorsIDs.TWENTY_FIVE_PERCENT_TEXT,
    );
  }

  get fiftyPercentButton(): DetoxElement {
    return Matchers.getElementByText(
      PredictWithdrawSelectorsIDs.FIFTY_PERCENT_TEXT,
    );
  }

  get maxButton(): DetoxElement {
    return Matchers.getElementByText(PredictWithdrawSelectorsIDs.MAX_TEXT);
  }

  get amountInput(): DetoxElement {
    return Matchers.getElementByID(PredictWithdrawSelectorsIDs.AMOUNT_INPUT);
  }

  get doneButton(): DetoxElement {
    return Matchers.getElementByID(PredictWithdrawSelectorsIDs.DONE_BUTTON);
  }

  get deleteButton(): DetoxElement {
    return Matchers.getElementByID('keypad-delete-button');
  }

  async tapMaxButton(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Max percentage button on Custom Amount screen',
    });
  }

  async tapTenPercent(): Promise<void> {
    await Gestures.waitAndTap(this.tenPercentButton, {
      elemDescription: '10% percentage button on Custom Amount screen',
    });
  }

  async tapTwentyFivePercent(): Promise<void> {
    await Gestures.waitAndTap(this.twentyFivePercentButton, {
      elemDescription: '25% percentage button on Custom Amount screen',
    });
  }

  async tapFiftyPercent(): Promise<void> {
    await Gestures.waitAndTap(this.fiftyPercentButton, {
      elemDescription: '50% percentage button on Custom Amount screen',
    });
  }

  async focusAmountInput(): Promise<void> {
    await Gestures.waitAndTap(this.amountInput, {
      elemDescription: 'Focus amount input to reveal percentage buttons',
      checkEnabled: false,
      checkVisibility: false,
    });
  }

  async tapDigit(digit: string): Promise<void> {
    const key = Matchers.getElementByText(digit) as DetoxElement;
    await Gestures.waitAndTap(key, {
      elemDescription: `Keypad: ${digit}`,
      checkEnabled: false,
      checkVisibility: false,
    });
  }

  async tapDelete(): Promise<void> {
    await Gestures.waitAndTap(this.deleteButton, {
      elemDescription: 'Keypad delete button',
    });
  }

  async clearAll(): Promise<void> {
    await Gestures.longPress(this.deleteButton, {
      duration: 1200,
      elemDescription: 'Long press delete to clear all',
    });
  }

  async expectAmountVisible(amountText: string): Promise<void> {
    const expected = amountText.startsWith('$')
      ? amountText.slice(1)
      : amountText;
    await Assertions.expectElementToHaveText(
      Matchers.getElementByID(PredictWithdrawSelectorsIDs.AMOUNT_INPUT),
      expected,
      { description: `amount ${expected} visible`, timeout: 5000 },
    );
  }

  async expectAmountContains(partial: string): Promise<void> {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByTextContains(partial),
      { description: `amount contains ${partial}`, timeout: 5000 },
    );
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
