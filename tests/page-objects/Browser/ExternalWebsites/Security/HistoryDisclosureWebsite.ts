import Matchers from '../../../../framework/Matchers.ts';
import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions.ts';

class HistoryDisclosureWebsite {
  async verifyUniswapElementNotExist(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//*[contains(text(), 'uniswap.org')]",
      ),
      { timeout: 3000 },
    );
  }
}

export default new HistoryDisclosureWebsite();
