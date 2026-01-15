import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Matchers from '../../../framework/Matchers.ts';

class UniswapWebsite {
  async tapConnectButton(): Promise<void> {
    const connectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[.//span[text()='Connect']]",
    );
    await connectButton.tap();
  }

  async tapOtherWalletsButton(): Promise<void> {
    const otherWalletsButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//*[.//span[text()='Other wallets']][@class][@style or contains(@class, '_cursor-pointer')]",
    );
    await otherWalletsButton.tap();
  }

  async tapMetaMaskWalletOptionButton(): Promise<void> {
    const metaMaskWalletOptionButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//*[.//span[text()='MetaMask'] and contains(@class, '_cursor-pointer')]",
    );
    await metaMaskWalletOptionButton.tap();
  }

  async tapSelectTokenButton(): Promise<void> {
    const selectTokenButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[.//span[contains(text(),'Select a token')]]",
    );
    await selectTokenButton.tap();
  }
}

export default new UniswapWebsite();
