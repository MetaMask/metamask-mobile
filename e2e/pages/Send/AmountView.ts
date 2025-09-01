import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import {
  AmountViewSelectorsIDs,
  AmountViewSelectorsText,
} from '../../selectors/SendFlow/AmountView.selectors';

class AmountView {
  get currencySwitch(): DetoxElement {
    return Matchers.getElementByID(AmountViewSelectorsIDs.CURRENCY_SWITCH);
  }

  get title(): DetoxElement {
    return Matchers.getElementByText(AmountViewSelectorsText.SCREEN_TITLE);
  }

  get nextButton(): DetoxElement {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AmountViewSelectorsIDs.NEXT_BUTTON)
      : Matchers.getElementByLabel(AmountViewSelectorsIDs.NEXT_BUTTON);
  }

  get backButton(): DetoxElement {
    return Matchers.getElementByID(AmountViewSelectorsIDs.SEND_BACK_BUTTON);
  }

  get amountInputField(): DetoxElement {
    return Matchers.getElementByID(AmountViewSelectorsIDs.AMOUNT_INPUT);
  }

  get maxButton(): DetoxElement {
    return Matchers.getElementByID(AmountViewSelectorsIDs.MAX_BUTTON);
  }

  async tapNextButton(): Promise<void> {
    await Gestures.waitAndTap(this.nextButton, {
      elemDescription: 'Next Button in Amount View',
    });
  }

  async tapBackButton(): Promise<void> {
    await Gestures.waitAndTap(this.backButton, {
      elemDescription: 'Back Button in Amount View',
    });
  }

  async typeInTransactionAmount(amount: string): Promise<void> {
    const elemDescription = `Amount Input Field in Amount View`;
    device.getPlatform() === 'android'
      ? await Gestures.typeText(this.amountInputField, amount, {
          elemDescription,
          hideKeyboard: true,
        })
      : await Gestures.replaceText(this.amountInputField, amount, {
          elemDescription,
        });
  }

  async tapCurrencySwitch(): Promise<void> {
    await Gestures.waitAndTap(this.currencySwitch, {
      elemDescription: 'Currency Switch in Amount View',
    });
  }

  async tapMaxButton(): Promise<void> {
    await Gestures.waitAndTap(this.maxButton, {
      elemDescription: 'Max Button in Amount View',
    });
  }
}
export default new AmountView();
