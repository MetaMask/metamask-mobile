import Matchers from '../../utils/Matchers';
import Gestures from '../../utils/Gestures';
import {
  AmountViewSelectorsIDs,
  AmountViewSelectorsText
} from '../../selectors/SendFlow/AmountView.selectors';

class AmountView {
  get title() {
    return Matchers.getElementByText(AmountViewSelectorsText.SCREEN_TITLE);
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
}
export default new AmountView();
