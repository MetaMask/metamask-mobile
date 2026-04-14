import Matchers from '../../../../framework/Matchers';
import { BrowserViewSelectorsIDs } from '../../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import Assertions from '../../../../framework/Assertions';

class HistoryDisclosureWebsite {
  async verifyVisitedTargetNotLeaked(): Promise<void> {
    await Assertions.expectElementToNotBeVisible(
      Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//p[@id='result' and contains(text(), 'visited-target.html was visited')]",
      ),
      { timeout: 3000 },
    );
  }
}

export default new HistoryDisclosureWebsite();
