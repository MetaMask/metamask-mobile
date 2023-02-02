import Selectors from '../helpers/Selectors';
import Gestures from "../helpers/Gestures";

class CommonScreen {
  async isTextDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).toBeDisplayed();
  }

  async isTextElementNotDisplayed(text) {
    await expect(Selectors.getXpathElementByText(text)).not.toBeDisplayed();
  }

  async tapOnText(text) {
    await Gestures.tapTextByXpath(text);
  }
}

export default new CommonScreen();
