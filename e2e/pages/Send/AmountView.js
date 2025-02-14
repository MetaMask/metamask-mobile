import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  AmountViewSelectorsIDs,
  AmountViewSelectorsText
} from '../../selectors/SendFlow/AmountView.selectors';
import TestHelpers from '../../helpers';


class AmountView {
  get currencySwitch() {
    return Matchers.getElementByID(AmountViewSelectorsIDs.CURRENCY_SWITCH);
  }

  get title() {
    return Matchers.getElementByText(AmountViewSelectorsText.SCREEN_TITLE);
  }

  get nextButton() {
    return device.getPlatform() === 'ios'
      ? Matchers.getElementByID(AmountViewSelectorsIDs.NEXT_BUTTON)
      : Matchers.getElementByLabel(AmountViewSelectorsIDs.NEXT_BUTTON);
  }

  get backButton() {
    return Matchers.getElementByID(AmountViewSelectorsIDs.SEND_BACK_BUTTON);
  }

  get amountInputField() {
    return Matchers.getElementByID(AmountViewSelectorsIDs.AMOUNT_INPUT);
  }

  async tapNextButton() {
    await TestHelpers.delay(1000);
    await Gestures.waitAndTap(this.nextButton);
  }

  async tapBackButton() {
    await Gestures.waitAndTap(this.backButton);
  }

  async typeInTransactionAmount(amount) {
    await TestHelpers.delay(1000);
    device.getPlatform() === 'android'
      ? await Gestures.typeTextAndHideKeyboard(this.amountInputField, amount)
      : await Gestures.replaceTextInField(this.amountInputField, amount);
    await TestHelpers.delay(1000);

  }

  async tapCurrencySwitch() {
    await Gestures.waitAndTap(this.currencySwitch);
  }
}
export default new AmountView();
