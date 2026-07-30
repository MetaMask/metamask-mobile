import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';
import { FrameworkDetector } from '../../../../framework/FrameworkDetector';
import Matchers from '../../../../framework/Matchers';
import { PlatformDetector } from '../../../../framework/PlatformLocator';
import PlaywrightAssertions from '../../../../framework/PlaywrightAssertions';
import PlaywrightContextHelpers from '../../../../framework/PlaywrightContextHelpers';
import PlaywrightMatchers from '../../../../framework/PlaywrightMatchers';
import PlaywrightWebMatchers from '../../../../framework/PlaywrightWebMatchers';

const VISITED_TARGET_LEAKED_XPATH =
  "//p[@id='result' and contains(text(), 'visited-target.html was visited')]";
const NO_HISTORY_LEAKED_XPATH =
  "//p[@id='result' and contains(text(), 'No history leaked')]";
const UNISWAP_VISITED_XPATH =
  "//p[@id='result' and contains(text(), 'uniswap.org was visited')]";

class HistoryDisclosureWebsite {
  async verifyUniswapElementNotExist(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        UNISWAP_VISITED_XPATH,
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
  async verifyVisitedTargetNotLeaked(pageUrl?: string): Promise<void> {
    if (FrameworkDetector.isAppium()) {
      if (!pageUrl) {
        throw new Error(
          'pageUrl is required for HistoryDisclosureWebsite.verifyVisitedTargetNotLeaked under Appium',
        );
      }

      if (PlatformDetector.isAndroid()) {
        await PlaywrightContextHelpers.switchToNativeContext();
        await PlaywrightAssertions.expectElementToBeVisible(
          PlaywrightMatchers.getElementByAndroidUIAutomator(
            '.textContains("No history leaked")',
          ),
          {
            timeout: 10000,
            description: 'History disclosure page reports no leak (Android)',
          },
        );
        return;
      }

      await PlaywrightWebMatchers.withWebViewAction(pageUrl, async () => {
        await PlaywrightAssertions.expectElementToBeVisible(
          PlaywrightWebMatchers.getElementByXPath(
            NO_HISTORY_LEAKED_XPATH,
            pageUrl,
          ),
          {
            timeout: 10000,
            description: 'History disclosure page reports no leak (iOS)',
          },
        );
        await PlaywrightAssertions.expectElementToNotBeVisible(
          PlaywrightWebMatchers.getElementByXPath(
            VISITED_TARGET_LEAKED_XPATH,
            pageUrl,
          ),
          {
            timeout: 3000,
            description: 'Visited target page indicator is not visible',
          },
        );
      });
      return;
    }

    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        VISITED_TARGET_LEAKED_XPATH,
      ),
      {
        timeout: 3000,
        description: 'Visited target page indicator is not visible',
      },
    );
  }
}

export default new HistoryDisclosureWebsite();
