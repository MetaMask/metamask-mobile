import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';
import { PerpsWithdrawViewSelectorsIDs } from '../../app/components/UI/Perps/Perps.testIds';
import { QuoteViewSelectorIDs,QuoteViewSelectorText } from '../../app/components/UI/Swaps/QuoteView.testIds';
import { SwapsViewSelectorsIDs } from '../../app/components/UI/Swaps/SwapsView.testIds';
import { splitAmountIntoDigits } from 'appwright/utils/Utils';

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
  get destinationTokenArea(){
    return AppwrightSelectors.getElementByID(this._device, PerpsWithdrawViewSelectorsIDs.DEST_TOKEN_AREA);

  }
  get seeAllDropDown(){
    return AppwrightSelectors.getElementByText(this._device, "See all");

  }

  get getETHQuotesButton(){
    return AppwrightSelectors.getElementByText(this._device, QuoteViewSelectorText.GET_QUOTES);
  }

  async isQuoteDisplayed(network) {
    if (network == 'Ethereum'){ // legacy swap view only shows on etheruem network
      const mmFee = await AppwrightSelectors.getElementByID(this._device, SwapsViewSelectorsIDs.QUOTE_SUMMARY);
      await appwrightExpect(mmFee).toBeVisible({ timeout: 10000 });

    }
    else{
      const element = await this.quoteDisplayed; // bridge swap view shows on
      await appwrightExpect(element).toBeVisible({ timeout: 10000 });
      const mmFee = await AppwrightSelectors.getElementByCatchAll(this._device, QuoteViewSelectorText.FEE_DISCLAIMER);
      await appwrightExpect(mmFee).toBeVisible({ timeout: 10000 });
    }

  }

  async enterSourceTokenAmount(amount) {
    // Split amount into digits
    const digits = splitAmountIntoDigits(amount);
    console.log('Amount digits:', digits);
    digits.forEach(async digit => {
      if (AppwrightSelectors.isAndroid(this._device)) {
        if (digit != '.') {
          const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='${digit}']`);
          await numberKey.tap();
        }
        else {
          const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.view.ViewGroup[@content-desc="."]`);
          await numberKey.tap();
        }
      }
      else {
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="${digit}"]`);
        await numberKey.tap();
      }
    });
  }

  async selectNetworkAndTokenTo(network, token) {
    let tokenButton;

    if (network == 'Ethereum'){
      const tokenDropDown = await AppwrightSelectors.getElementByID(this._device, QuoteViewSelectorIDs.DEST_TOKEN)
      await tokenDropDown.tap();
      if (AppwrightSelectors.isIOS(this._device)){
        tokenButton = await AppwrightSelectors.getElementByText(this._device, `${token} ${token}`);
        await tokenButton.tap();
      }
      else {
        tokenButton = await AppwrightSelectors.getElementByCatchAll(this._device, token);
        await tokenButton.tap();

        }
      }
    else {
      const destinationToken = await this.destinationTokenArea;
      await destinationToken.tap();
      const selectAllDropDown = await this.seeAllDropDown;
      await selectAllDropDown.tap();
      const networkName = await AppwrightSelectors.getElementByText(this._device, network);
      await networkName.tap();
      const tokenButton = await AppwrightSelectors.getElementByText(this._device, token);
      await tokenButton.tap();
    }

  }

  async tapGetQuotes(network){
    if (network == 'Ethereum'){
    const quotesButton = await this.getETHQuotesButton;
    await appwrightExpect(quotesButton).toBeVisible({ timeout: 10000 });
    await quotesButton.tap();
    }
  }

  async enterDestinationTokenAmount(amount) {
    await AppwrightGestures.typeText(await this.destTokenInput, amount);
  }

  async isVisible() {
    const element = await this.sourceTokenInput;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new SwapScreen();
