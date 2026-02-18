import AppwrightGestures from '../../tests/framework/AppwrightGestures';
import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import { SWAP_SCREEN_DESTINATION_TOKEN_INPUT_ID, SWAP_SCREEN_QUOTE_DISPLAYED_ID, SWAP_SCREEN_SOURCE_TOKEN_INPUT_ID } from './testIDs/Screens/SwapScreen.testIds';
import { expect as appwrightExpect } from 'appwright';
import {
  QuoteViewSelectorIDs,
  QuoteViewSelectorText,
} from '../../tests/selectors/Bridge/QuoteView.selectors';
import Selectors from '../helpers/Selectors.js';
import { LoginViewSelectors } from '../../app/components/Views/Login/LoginView.testIds';
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
  get destinationTokenArea() {
    return AppwrightSelectors.getElementByID(
      this._device,
      QuoteViewSelectorIDs.DESTINATION_TOKEN_AREA,
      true, // exact match: token button, not dest-token-area-input
    );
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
    const mmFee = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      QuoteViewSelectorText.INSUFFICIENT_FUNDS,
    );
    await appwrightExpect(mmFee).toBeVisible({ timeout: 30000 });
  }

  /**
   * Returns true if the "trade route isn't available" error banner is visible.
   * Use this to skip the test when there is lack of liquidity.
   */
  async isRouteUnavailableVisible() {
    const banner = await AppwrightSelectors.getElementByCatchAll(
      this._device,
      'available right now',
    );
    return banner.isVisible({ timeout: 10000 }).catch(() => false);
  }

  get sourceTokenAreaInput() {
    return AppwrightSelectors.getElementByID(
      this._device,
      QuoteViewSelectorIDs.SOURCE_TOKEN_INPUT,
    );
  }

  async enterSourceTokenAmount(amount) {
    const sourceInput = await this.sourceTokenAreaInput;
    await AppwrightGestures.tap(sourceInput);
    // Tap each digit on the numeric keypad
    const digits = amount.split('');
    AmountScreen.device = this._device;
    for (const digit of digits) {
      const digitButton = await AppwrightSelectors.getElementByText(this._device, digit, true);
      await appwrightExpect(digitButton).toBeVisible({ timeout: 10000 });
      await AmountScreen.tapNumberKey(digit);
    }
  }

  async selectNetworkAndTokenTo(network, token) {
    const destinationToken = await this.destinationTokenArea;
    await appwrightExpect(destinationToken).toBeVisible({ timeout: 10000 });
    await AppwrightGestures.tap(destinationToken);

    if (network !== 'Ethereum') {
      const networkButton = await this.getNetworkButton(network);
      await AppwrightGestures.tap(networkButton);
    }

    let tokenNetworkId;
    if (network === 'Ethereum') {
      tokenNetworkId = '0x1';
    } else if (network === 'Polygon') {
      tokenNetworkId = '0x89';
    } else if (network === 'Solana') {
      tokenNetworkId = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';
    }
    const tokenSelector = `asset-${tokenNetworkId}-${token}`;
    const tokenButton = await AppwrightSelectors.getElementByID(
      this._device,
      tokenSelector,
      true,
    );
    // Scroll down the list to bring token into view (e.g. LINK is below ETH, USDT, etc.)
    const tokenElement = await AppwrightGestures.scrollIntoView(
      this._device,
      tokenButton,
      { scrollParams: { direction: 'down' } },
    );
    await AppwrightGestures.tap(tokenElement);
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
