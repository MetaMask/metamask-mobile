import AppwrightSelectors from '../helpers/AppwrightSelectors.js';
import AppwrightGestures from '../../appwright/utils/AppwrightGestures.js';
import { expect as appwrightExpect } from 'appwright';
import TimerHelper from '../../appwright/utils/TimersHelper.js';
import { SendActionViewSelectorsIDs } from '../../e2e/selectors/SendFlow/SendActionView.selectors';

class SendSolanaScreen extends AppwrightGestures {
  constructor() {
    super();
  }

  set device(device) {
    this._device = device;
    super.device = device; // Set device in parent class too
  }

  get addressField() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByID(this._device, SendActionViewSelectorsIDs.SOLANA_INPUT_ADDRESS_FIELD);
    }
    return AppwrightSelectors.getElementByID(this._device, 'textfield');
  }

  get amountField() {
    if (AppwrightSelectors.isAndroid(this._device)) {
      return AppwrightSelectors.getElementByID(this._device, SendActionViewSelectorsIDs.SOLANA_INPUT_AMOUNT_FIELD);
    }
    return AppwrightSelectors.getElementByXpath(this._device, '(//XCUIElementTypeOther[@name="textfield"])[2]');
  }

  get continueButton() {
    return AppwrightSelectors.getElementByID(this._device, SendActionViewSelectorsIDs.CONTINUE_BUTTON);
  }

  get cancelButton() {
    return AppwrightSelectors.getElementByID(this._device, SendActionViewSelectorsIDs.CANCEL_BUTTON);
  }

  async isAddressFieldVisible() {
    const element = await this.addressField;
    await appwrightExpect(element).toBeVisible();
  }

  async fillAddressField(address) {
    const element = await this.addressField;
    if (AppwrightSelectors.isIOS(this._device)) {
      await this.typeText(element, `${address}\n`); // Use inherited typeText method with retry logic
    } else{
      await this.typeText(element, `${address}`); // Use inherited typeText method with retry logic
    }
  }

  async fillAmountField(amount) {
    const element = await this.amountField;
    await this.typeText(element, amount); // Use inherited typeText method with retry logic
    const continueButton = await this.continueButton;
    await appwrightExpect(continueButton).toBeVisible({ timeout: 10000 });
  }

  async tapContinueButton() {
    await this._device.waitForTimeout(5000); //workaroud for the button to become clickable
    const continueButton = await this.continueButton;
    await appwrightExpect(continueButton).toBeVisible({ timeout: 10000 });
    const timer1 = new TimerHelper(
      'Time since the user is on the send amount screen until the user gets the confirmation screen',
    );
    timer1.start();
    await continueButton.tap();
    return timer1;
  }

  async tapCancelButton() {
    const element = await this.cancelButton;
    await element.tap();
  }
}

export default new SendSolanaScreen();
