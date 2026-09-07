import { BrowserViewSelectorsIDs } from '../../../../app/components/Views/BrowserTab/BrowserView.testIds';
import ChromeCdpHelpers from '../../../framework/ChromeCdpHelpers';
import Gestures from '../../../framework/Gestures';
import Matchers from '../../../framework/Matchers';
import { PlatformDetector } from '../../../framework/PlatformLocator';
import { EnsWebsiteSelectorsXPath } from '../../../selectors/Browser/EnsWebsite.selectors';

const ENS_GENERAL_LINK_ID = 'ens-general-link';

class EnsWebsite {
  /**
   * Taps the "General" link on the ENS fixture page.
   * @param pageUrl - Full page URL (required for Appium WebView context switching).
   */
  async tapGeneralButton(pageUrl?: string): Promise<void> {
    if (!pageUrl) {
      throw new Error(
        'pageUrl is required for EnsWebsite.tapGeneralButton under Appium',
      );
    }

    if (PlatformDetector.isAndroid()) {
      // Android Chromedriver context switch fails under LavaMoat ShadowRoot
      // scuttling — click the fixture link via CDP in the MetaMask WebView.
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        pageUrl,
        ENS_GENERAL_LINK_ID,
      );
      if (!clicked) {
        throw new Error(
          `Failed to click #${ENS_GENERAL_LINK_ID} via CDP on ${pageUrl}`,
        );
      }
      return;
    }

    const generalLink = await Matchers.getElementByXPath(
      BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
      EnsWebsiteSelectorsXPath.GENERAL_LINK,
      pageUrl,
    );
    await Gestures.waitAndTap(generalLink, {
      elemDescription: 'ENS website General link',
    });
  }
}

export default new EnsWebsite();
