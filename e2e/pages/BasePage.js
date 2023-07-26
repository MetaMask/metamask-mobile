import TestHelpers from '../helpers';

export default class BasePage {
  static async waitForToastMessageVisible(text) {
    await TestHelpers.checkIfElementByTextIsVisible(text);
  }

  static async waitForToastMessageToGoAway(text){
    await TestHelpers.checkIfElementWithTextIsNotVisible(text);
  }
}
