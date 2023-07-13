import TestHelpers from '../helpers';
//import {
//} from '../../wdio/screen-objects/testIDs/Screens/SendScreen.testIds';


export default class SwapView {
  static async tapStartSwapping() {
    await TestHelpers.waitAndTapText('Start swapping')
  }

  static async findKeypadButton(digit) {
    return await TestHelpers.waitAndTapText(digit);
  }
  static async enterSwapAmount(amount) {
    for (let idx = 0; idx < amount.length; idx++) {
      await await TestHelpers.waitAndTapText(amount[idx])
    }
  }

  static async tapOnSelectTokenTo() {
    return await TestHelpers.waitAndTapText("Select a token")
  }

  static async selectToken(token) {
    return TestHelpers.waitAndTapText(token)
  }

  static async tapOnGetQuotes() {
    await TestHelpers.checkIfElementByTextIsVisible("Get quotes")
    return await TestHelpers.waitAndTapText("Get quotes")
  }

  static async waitForNewQuoteToDisplay() {
   // await TestHelpers.checkIfElementByTextIsVisible("Fetching quotes")
    //await TestHelpers.checkIfElementWithTextIsVisible('CIAO')
    //await TestHelpers.checkIfExists('new-quotes')
  await device.disableSynchronization()
   await TestHelpers.checkIfExists('new-quote')
  }
}



