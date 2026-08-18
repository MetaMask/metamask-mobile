import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';
import Matchers from '../../../../framework/Matchers';
import { PlatformDetector } from '../../../../framework/PlatformLocator';
import PlaywrightContextHelpers from '../../../../framework/PlaywrightContextHelpers';

const VISITED_TARGET_LEAKED_XPATH =
  "//p[@id='result' and contains(text(), 'visited-target.html was visited')]";
const NO_HISTORY_LEAKED_XPATH =
  "//p[@id='result' and contains(text(), 'No history leaked')]";
const UNISWAP_VISITED_XPATH =
  "//p[@id='result' and contains(text(), 'uniswap.org was visited')]";

class HistoryDisclosureWebsite {
  /**
   * Verifies the uniswap.org visited indicator is not shown.
   * @param pageUrl - Full history-disclosure.html URL (required for Appium WebView).
   */
  async verifyUniswapElementNotExist(pageUrl: string): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        UNISWAP_VISITED_XPATH,
        pageUrl,
      ),
      {
        timeout: 3000,
        description: 'Uniswap visited indicator is not visible',
      },
    );
  }

  /**
   * Verifies the attack page did not leak that visited-target.html was visited.
   * @param pageUrl - Full history-disclosure.html URL (required under Appium).
   */
  async verifyVisitedTargetNotLeaked(pageUrl: string): Promise<void> {
    if (PlatformDetector.isAndroid()) {
      await PlaywrightContextHelpers.switchToNativeContext();
      await Assertions.expectElementToBeVisible(
        Matchers.getElementByAndroidUIAutomator(
          '.textContains("No history leaked")',
        ),
        {
          timeout: 10000,
          description: 'History disclosure page reports no leak (Android)',
        },
      );
      return;
    }

    await Assertions.expectElementToBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        NO_HISTORY_LEAKED_XPATH,
        pageUrl,
      ),
      {
        timeout: 10000,
        description: 'History disclosure page reports no leak (iOS)',
      },
    );
    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        VISITED_TARGET_LEAKED_XPATH,
        pageUrl,
      ),
      {
        timeout: 3000,
        description: 'Visited target page indicator is not visible',
      },
    );
  }
}

export default new HistoryDisclosureWebsite();
