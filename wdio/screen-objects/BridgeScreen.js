import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';
import { PerpsWithdrawViewSelectorsIDs } from '../../app/components/UI/Perps/Perps.testIds';
import { QuoteViewSelectorText } from '../../e2e/selectors/Bridge/QuoteView.selectors';
import Selectors from '../helpers/Selectors.js';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
import { splitAmountIntoDigits } from 'appwright/utils/Utils.js';
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
  get seeAllDropDown(){
    return AppwrightSelectors.getElementByText(this._device, "See all");

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
    AmountScreen.device = this._device;
    await AmountScreen.enterAmount(amount);
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
    const tokenButton = await AppwrightSelectors.getElementByID(this._device, `asset-${tokenNetworkId}-${token}`);
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
