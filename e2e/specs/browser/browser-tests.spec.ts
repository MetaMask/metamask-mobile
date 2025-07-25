import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import ExternalSites from '../../resources/externalsites.json';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import Assertions from '../../framework/Assertions';
import TestHelpers from '../../helpers';
import { BrowserViewSelectorsIDs } from '../../selectors/Browser/BrowserView.selectors.ts';
import ConnectBottomSheet from '../../pages/Browser/ConnectBottomSheet.ts';
import Matchers from '../../framework/Matchers';
import Utilities from '../../framework/Utilities.ts';

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

  it('should test phishing sites inside iFrame', async () => {
    await withBrowser(async () => {
      await Browser.tapBottomSearchBar();
      // Clear text & Navigate to URL
      await Browser.navigateToURL(ExternalSites.PHISHING_SITE_INSIDE_IFRAME);
      await Assertions.expectElementToBeVisible(Browser.backToSafetyButton, {
        description: 'Back to safety button is visible',
      });

      await Browser.tapBackToSafetyButton();
      await Assertions.expectElementToNotHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.PHISHING_SITE_INSIDE_IFRAME),
        {
          description: 'URL input box does not have the phishing site',
        },
      );
    });
  });

  it('Should download blob file', async () => {
    await testDownloadFile(ExternalSites.DOWNLOAD_BLOB_FILE_WEBSITE);
  });

  it('Should download base64 file', async () => {
    await testDownloadFile(ExternalSites.DOWNLOAD_BASE64_FILE_WEBSITE);
  });

  async function testDownloadFile(url: string) {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(url);
      const downloadButton = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//button[@id='download_button']",
      );
      await downloadButton.tap();

      if (device.getPlatform() === 'ios') {
        // For iOS, we need a small delay before animated dialog is displayed
        await TestHelpers.delay(300);
      }

      // Verify Download button in dialog is disabled for first 500ms to prevent Tapjacking
      const downloadButtonInDialog =
        device.getPlatform() === 'android'
          ? Matchers.getElementByText('Download')
          : Matchers.getElementByLabel('Download');
      await Utilities.checkElementDisabled(downloadButtonInDialog);
      await TestHelpers.delay(600);
      await Utilities.checkElementEnabled(downloadButtonInDialog);
      await (await downloadButtonInDialog).tap();

      if (device.getPlatform() === 'ios') {
        await TestHelpers.delay(500);
        // Verify for iOS that system file saving dialog is visible
        waitFor(await Matchers.getElementByLabel('Save')).toBeVisible();
      } else {
        await TestHelpers.delay(3600);
        // Verify for Android that toast after successful downloading is visible
        waitFor(
          await Matchers.getElementByText('Downloaded successfully'),
        ).toBeVisible();
      }
    });
  }

  it('Should connect to Uniswap', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.UNISWAP_WEBSITE);

      // Click Connect button
      const connectButton = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//button[.//span[text()='Connect']]",
      );
      await connectButton.tap();

      // Click Other wallets button
      const otherWalletsButton = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//*[.//span[text()='Other wallets']][@class][@style or contains(@class, '_cursor-pointer')]",
      );
      await otherWalletsButton.tap();

      // Click MetaMask wallet option
      const metaMaskWalletOption = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//*[.//span[text()='MetaMask'] and contains(@class, '_cursor-pointer')]",
      );
      await metaMaskWalletOption.tap();

      await ConnectBottomSheet.tapConnectButton();

      // Click Select a token button which is displayed only if the wallet is connected
      const selectTokenButton = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//button[.//span[contains(text(),'Select a token')]]",
      );
      await selectTokenButton.tap();
    });
  });

  it('Should open ENS website', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.ENS_WEBSITE);
      await TestHelpers.delay(1000); // Wait for a website to load
      // Click General to interact with vitalik website and make sure it's loaded
      const generalLink = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//a[@href='./categories/general.html']",
      );
      await generalLink.tap();
    });
  });

  it('Should display redireced URL after redirect on website', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.WEBSITE_WITH_REDIRECT);
      await Assertions.expectElementToHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.WEBSITE_WITH_REDIRECT),
        {
          description:
            'URL input box has the correct text from the initial website',
        },
      );
      const redirectButton = await Matchers.getElementByXPath(
        BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
        "//button[@id='redirect_button']",
      );
      await redirectButton.tap(); // Click button to redirect to http://portfolio.metamask.io website
      await Assertions.expectElementToHaveText(
        Browser.urlInputBoxID,
        getHostFromURL(ExternalSites.PORTFOLIO),
        {
          description:
            'URL input box has the correct text from the redirected website',
        },
      );
    });
  });
});
