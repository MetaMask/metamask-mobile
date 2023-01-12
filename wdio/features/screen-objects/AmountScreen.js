import Gestures from '../helpers/Gestures';
import Selectors from '../helpers/Selectors';
import { 
  AMOUNT_INPUT_FIELD,
  NEXT_BUTTON,
} from '../testIDs/Screens/AmountScreen.testIds';

class AmountScreen {
  get amountInputField() {
    return Selectors.getElementByPlatform(AMOUNT_INPUT_FIELD);
  }
  get nextButton() {
    return Selectors.getElementByPlatform(NEXT_BUTTON);
  }

  get nextButton() {
   return Selectors.getElementByPlatform(ADDRESS_BOOK_NEXT_BUTTON);
  }

  async typeAmount(amount) {
    await Gestures.typeText(this.amountInputField, amount);
  }

  async tapNextButton() {
    await Gestures.tapTextByXpath('Next');
  }
}
export default new AmountScreen();
