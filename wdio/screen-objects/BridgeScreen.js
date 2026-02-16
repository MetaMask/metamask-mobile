import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';
import { PerpsWithdrawViewSelectorsIDs } from '../../app/components/UI/Perps/Perps.testIds';
import { QuoteViewSelectorText } from '../../tests/selectors/Bridge/QuoteView.selectors';
import Selectors from '../helpers/Selectors.js';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
import { splitAmountIntoDigits } from '../../tests/framework/utils/Utils.js';
import AmountScreen from './AmountScreen';

class BridgeScreen {

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
  get destinationTokenArea(){
    return AppwrightSelectors.getElementByID(this._device, PerpsWithdrawViewSelectorsIDs.DEST_TOKEN_AREA);
  }

  getNetworkButton(networkName) {
    if (!this._device) {
      return Selectors.getXpathElementByResourceId(
        LoginViewSelectors.PASSWORD_INPUT,
      );
    } else {
      if (AppwrightSelectors.isAndroid(this._device)) {
        return AppwrightSelectors.getElementByCatchAll(this._device, networkName);
      } else {
        return AppwrightSelectors.getElementByID(this._device, `${networkName}`);
      }
    }
  }

  async isQuoteDisplayed() {
      const mmFee = await AppwrightSelectors.getElementByCatchAll(this._device, "Includes 0.875% MetaMask fee");
      await appwrightExpect(mmFee).toBeVisible({ timeout: 30000 });


  }

  async enterSourceTokenAmount(amount) {
    // Tap each digit on the numeric keypad. Use AmountScreen.tapNumberKey (XPath for keypad button only)
    // instead of getElementByText(digit), which matches label == "1" etc. and can find multiple elements.
    const digits = splitAmountIntoDigits(amount);
    AmountScreen.device = this._device;
    for (const digit of digits) {
      await AmountScreen.tapNumberKey(digit);
    }
  }

  async selectNetworkAndTokenTo(network, token) {
    const destinationToken = await this.destinationTokenArea;
    await AppwrightGestures.tap(destinationToken);
    const networkButton = await this.getNetworkButton(network);
    await AppwrightGestures.tap(networkButton);
    let tokenNetworkId;
    if (network == 'Ethereum'){
      tokenNetworkId = `0x1`;
    }
    else if (network == 'Polygon'){
      tokenNetworkId = `0x89`;
    }
    else if (network == 'Solana'){
      tokenNetworkId = `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp`;
    }
    const tokenId = `asset-${tokenNetworkId}-${token}`;
    // Escape single quotes for XPath: in XPath 1.0, '' inside a quoted string is one literal '
    const escapedTokenId = tokenId.replace(/'/g, "''");
    // Exact match so we don't select a different asset whose id contains this as substring (e.g. LINK vs wrapped-LINK).
    // Multiple rows may share the same testID; use first match to avoid "Find multiple elements".
    const tokenButton = AppwrightSelectors.isIOS(this._device)
      ? await AppwrightSelectors.getElementByXpath(
          this._device,
          `(//*[@name='${escapedTokenId}'])[1]`,
        )
      : await AppwrightSelectors.getElementByXpath(
          this._device,
          `(//*[@resource-id='${escapedTokenId}'])[1]`,
        );
    await appwrightExpect(tokenButton).toBeVisible({ timeout: 15000 });
    await AppwrightGestures.tap(tokenButton);
  }

  async enterDestinationTokenAmount(amount) {
    const element = await this.destTokenInput;
    await AppwrightGestures.typeText(element, amount);
  }

  async isVisible() {
    const element = await this.sourceTokenInput;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new BridgeScreen();
