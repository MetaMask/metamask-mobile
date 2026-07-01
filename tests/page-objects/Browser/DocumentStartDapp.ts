import { BrowserViewSelectorsIDs } from '../../../app/components/Views/BrowserTab/BrowserView.testIds';
import { Assertions, Matchers } from '../../framework';
import {
  DocumentStartDappSelectorsText,
  DocumentStartDappSelectorsWebIDs,
} from '../../selectors/Browser/DocumentStartDapp.selectors';

class DocumentStartDapp {
  get documentStartStatus(): WebElement {
    return Matchers.getElementByWebID(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      DocumentStartDappSelectorsWebIDs.DOCUMENT_START_STATUS,
    );
  }

  async expectEthereumAvailableBeforeFirstInlineScript(): Promise<void> {
    await Assertions.expectElementToContainText(
      this.documentStartStatus,
      DocumentStartDappSelectorsText.ETHEREUM_AVAILABLE_BEFORE_INLINE_SCRIPT,
      {
        description:
          'window.ethereum should be available before the first inline script completes',
      },
    );
  }
}

export default new DocumentStartDapp();
