import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';

class SwapScreen {
  get device() {
    return this._device;
  }

  set device(device) {
    this._device = device;
  }
  get sourceTokenInput() {
    return AppwrightSelectors.getElementByID(this._device, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID);
  }

  get destTokenInput() {
    return AppwrightSelectors.getElementByID(this._device, SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID);
  }

  get quoteDisplayed() {
    return AppwrightSelectors.getElementByID(this._device, SWAP_SCREEN_QUOTE_DISPLAYED_ID);
  }

  async isQuoteDisplayed() {
    const element = await this.quoteDisplayed;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
    const mmFee = await AppwrightSelectors.getElementByText(this._device, 'Includes 0.875% MM fee');
    await appwrightExpect(mmFee).toBeVisible({ timeout: 10000 });
  }

  async enterSourceTokenAmount(amount) {
    // Split amount into digits
    const digits = this.splitAmountIntoDigits(amount);
    console.log('Amount digits:', digits);
    
    digits.forEach(async digit => {
        const numberKey = await AppwrightSelectors.getElementByText(this._device, digit);
        await numberKey.tap();
    });
  }

  async selectNetworkAndTokenTo(network, token) {
    await this.device.pause(100000000);
    const networkButton = await AppwrightSelectors.getElementByText(this._device, 'USDC');
    await networkButton.tap();
    const solanaButton = await AppwrightSelectors.getElementByText(this._device, network);
    await solanaButton.tap();
    const tokenButton = await AppwrightSelectors.getElementByText(this._device, token);
    await tokenButton.tap();
  }

  // Helper method to split amount into digits
  splitAmountIntoDigits(amount) {
    // Convert to string and split into array of digits
    return amount.toString().split('').map(char => {
      // Return only numeric digits, filter out decimal points, commas, etc.
      return /\d/.test(char) ? parseInt(char, 10) : char;
    });
  }

  async enterDestinationTokenAmount(amount) {
    const element = await this.destTokenInput;
    await element.fill(amount);
  }
}

export default new SwapScreen();
