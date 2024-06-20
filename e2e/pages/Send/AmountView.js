import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import { AmountViewSelectorsIDs } from '../../selectors/SendFlow/AmountView.selectors';

class AmountView {
  get currencySwitch() {
    return Matchers.getElementByID(AmountViewSelectorsIDs.CURRENCY_SWITCH);
  }

  get nextButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AmountViewSelectorsIDs.NEXT_BUTTON)
      : Matchers.getElementByLabel(AmountViewSelectorsIDs.NEXT_BUTTON);
  }

  get amountInputField() {
    return Matchers.getElementByID(AmountViewSelectorsIDs.AMOUNT_INPUT);
  }

  async tapNextButton() {
    await Gestures.waitAndTap(this.nextButton);
  }

  async typeInTransactionAmount(amount) {
    device.getPlatform() === 'android'
      ? await Gestures.typeTextAndHideKeyboard(this.amountInputField, amount)
      : await Gestures.replaceTextInField(this.amountInputField, amount);
  }

  async tapCurrencySwitch() {
    await Gestures.waitAndTap(this.currencySwitch);
  }
}
export default new AmountView();
