import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import ExternalSites from '../../resources/externalsites.json';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';

const getHostFromURL = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.host;
  } catch (e) {
    // If URL is invalid, try a simple regex approach as fallback
    const match = url.match(/^(?:https?:\/\/)?([^/]+)/i);
    return match ? match[1] : url;
  }
};

const withBrowser = async (fn: () => Promise<void>) => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().build(),
      restartDevice: true,
    },
    async () => {
      await loginToApp();
      await TabBarComponent.tapBrowser();
      await fn();
    },
  );
};

describe(SmokeWalletPlatform('Browser Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should connect to the test dapp', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.TEST_DAPP);
      await Assertions.expectElementToHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.TEST_DAPP),
        {
          description: 'URL input box has the correct text',
        },
      );
    });
  });

  it('should test invalid URL', async () => {
    await withBrowser(async () => {
      await Browser.tapBottomSearchBar();
      // Clear text & Navigate to URL
      await Browser.navigateToURL(ExternalSites.INVALID_URL);
      await Browser.tapReturnHomeButton();
      await Assertions.expectElementToNotHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.INVALID_URL),
        {
          description: 'URL input box does not have the invalid URL',
        },
      );
    });
  });

  it.skip('should test phishing sites', async () => {
    await withBrowser(async () => {
      await Browser.tapBottomSearchBar();
      // Clear text & Navigate to URL
      await Browser.navigateToURL(ExternalSites.PHISHING_SITE);
      await Assertions.expectElementToBeVisible(Browser.backToSafetyButton, {
        description: 'Back to safety button is visible',
      });

      await Browser.tapBackToSafetyButton();
      await Assertions.expectElementToNotHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.PHISHING_SITE),
        {
          description: 'URL input box does not have the phishing site',
        },
      );
    });
  });
});
