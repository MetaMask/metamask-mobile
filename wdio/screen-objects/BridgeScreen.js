import AppwrightSelectors from '../helpers/AppwrightSelectors';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';
import { PerpsWithdrawViewSelectorsIDs } from '../../e2e/selectors/Perps/Perps.selectors';
import { SwapsViewSelectorsIDs } from '../../e2e/selectors/swaps/SwapsView.selectors';
import { QuoteViewSelectorText as BridgeQuotesSelectorText } from '../../e2e/selectors/Bridge/QuoteView.selectors';

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

  get getETHQuotesButton(){
    return AppwrightSelectors.getElementByText(this._device, QuoteViewSelectorText.GET_QUOTES);
  }

  async isQuoteDisplayed() {

      const element = await this.quoteDisplayed; // bridge swap view shows on 
      await appwrightExpect(element).toBeVisible({ timeout: 30000 });
      const mmFee = await AppwrightSelectors.getElementByCatchAll(this._device, BridgeQuotesSelectorText.FEE_DISCLAIMER);
      await appwrightExpect(mmFee).toBeVisible({ timeout: 30000 });
    

  }

  async enterSourceTokenAmount(amount) {
    // Split amount into digits
    const digits = this.splitAmountIntoDigits(amount);
    console.log('Amount digits:', digits);
    for (const digit of digits) {
      if (AppwrightSelectors.isAndroid(this._device)) {
        if (digit != '.') {
          const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='${digit}']`)
          await numberKey.waitFor('visible',{ timeout: 30000 });
          await numberKey.tap();
        }
        else {
          const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//android.view.View[@text="."]`);
          await numberKey.waitFor('visible',{ timeout: 30000 });
          await numberKey.tap();
        }
      }
      else {
        const numberKey = await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="${digit}"]`);
        await numberKey.waitFor('visible', { timeout: 30000 });
        await numberKey.tap();
      }
    }
  }

  async selectNetworkAndTokenTo(network, token) {
      const destinationToken = await this.destinationTokenArea;
      await destinationToken.tap();
      const networkButton = await AppwrightSelectors.getElementByCatchAll(this._device, network);
      await networkButton.tap();
      const tokenField = await AppwrightSelectors.getElementByText(this._device, 'Enter token name or paste address');
      await tokenField.fill(token);
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
      let tokenButton;
      if (AppwrightSelectors.isAndroid(this._device)){
        tokenButton = await AppwrightSelectors.getElementByXpath(this._device, `//*[@resource-id="asset-${tokenNetworkId}-${token}"]`);
      }
      else {
        // Try multiple iOS element selection strategies
        console.log(`Looking for iOS token with ID: asset-${tokenNetworkId}-${token}`);
        
        try {
          tokenButton = await AppwrightSelectors.getElementByNameiOS(this._device, `asset-${tokenNetworkId}-${token}`);
          console.log('Found token button by Name');
        } catch (error) {
          console.log('Name selector failed, trying ID selector for iOS...');
          tokenButton = await AppwrightSelectors.getElementByID(this._device, `asset-${tokenNetworkId}-${token}`);
          console.log('Found token button by ID');
        }
      }
      await tokenButton.waitFor('visible',{ timeout: 10000 });
      console.log('Token button found and visible');
      
      console.log('About to hide keyboard...');
      await AppwrightSelectors.hideKeyboard(this._device);
      console.log('Keyboard hidden successfully');

      console.log('About to tap token button...');
      
      // Try multiple tap strategies for iOS
      if (AppwrightSelectors.isAndroid(this._device)) {
        await tokenButton.tap();
      } else {
        // iOS-specific tap strategy
        console.log('Using iOS-specific tap strategy...');
        try {
          await tokenButton.tap();
          console.log('iOS click() succeeded');
        } catch (error) {
          console.log('iOS click() failed, trying tap()...');
          await tokenButton.tap();
          console.log('iOS tap() succeeded');
        }
      }
      console.log('Token button tapped successfully');
      
      // Wait for the amount input field to appear after tapping token
      await new Promise(resolve => setTimeout(resolve, 2000));
      console.log('Waited 2 seconds after token button tap');
      
      // Check if number input field is available
      try {
        const testNumberButton = AppwrightSelectors.isIOS(this._device) ? await AppwrightSelectors.getElementByXpath(this._device, `//XCUIElementTypeButton[@name="1"]`) : await AppwrightSelectors.getElementByXpath(this._device, `//android.widget.Button[@content-desc='1']`);
        await testNumberButton.waitFor('visible', { timeout: 5000 });
        console.log('Number input field is visible - token tap worked');
      } catch (error) {
        console.log('Number input field not visible - token tap may not have worked, trying alternative tap method...');
        
        // Try alternative tap methods for iOS
        await tokenButton.tap(); // Try click instead of tap
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('Tried alternative tap methods');
      }
  }

  async tapGetQuotes(network){
    if (network == 'Ethereum'){
    const quotesButton = await this.getETHQuotesButton;
    await appwrightExpect(quotesButton).toBeVisible({ timeout: 10000 });
    await quotesButton.tap();
    }
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

  async isVisible() {
    const element = await this.sourceTokenInput;
    await appwrightExpect(element).toBeVisible({ timeout: 10000 });
  }
}

export default new BridgeScreen();
