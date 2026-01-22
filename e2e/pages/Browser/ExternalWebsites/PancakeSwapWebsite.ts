import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Matchers from '../../../framework/Matchers.ts';

class PancakeSwapWebsite {
  async tapConnectButton(): Promise<void> {
    const connectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//div[text()='Connect' and contains(@class, 'bTTibN')]",
    );
    await connectButton.tap();
  }

  async tapMetaMaskButton(): Promise<void> {
    const metamaskWalletOptionButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//div[@title='Metamask']",
    );
    await metamaskWalletOptionButton.tap();
  }

  async tapEnterAmountButton(): Promise<void> {
    const enterAmountButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[normalize-space(text())='Enter an amount']",
    );
    await enterAmountButton.tap();
  }
}

export default new PancakeSwapWebsite();
