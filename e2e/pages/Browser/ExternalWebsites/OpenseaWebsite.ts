import { BrowserViewSelectorsIDs } from '../../../selectors/Browser/BrowserView.selectors.ts';
import Matchers from '../../../framework/Matchers.ts';

class OpenseaWebsite {
  async tapGetStartedButton(): Promise<void> {
    const getStartedButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[normalize-space()='Get Started']",
    );
    await getStartedButton.tap();
  }

  async tapCloseButton(): Promise<void> {
    const closeButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//*[name()='svg' and @aria-label='Close']",
    );
    await closeButton.tap();
  }

  async tapConnectButton(): Promise<void> {
    const connectButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[normalize-space()='Connect']",
    );
    await connectButton.tap();
  }

  async tapMetaMaskOptionButton(): Promise<void> {
    const metaMaskOptionButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//span[@data-id='ItemTitle' and normalize-space()='MetaMask']",
    );
    await metaMaskOptionButton.tap();
  }

  async tapEthereumButton(): Promise<void> {
    const ethereumButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//button[.//span[contains(text(), 'Ethereum and ') and contains(text(), ' more')]]",
    );
    await ethereumButton.tap();
  }

  async tapNotificationButton(): Promise<void> {
    const notificationsButton = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      "//*[name()='svg' and @aria-label='Notifications']",
    );
    await notificationsButton.tap();
  }
}

export default new OpenseaWebsite();
