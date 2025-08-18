import { SmokeWalletPlatform } from '../../../tags.js';
import { loginToApp } from '../../../viewHelper.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';
import ExternalSites from '../../../resources/externalsites.json';
import Browser from '../../../pages/Browser/BrowserView.ts';
import EnsWebsite from '../../../pages/Browser/ExternalWebsites/EnsWebsite.ts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.ts';
import Assertions from '../../../framework/Assertions.ts';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet.ts';
import RedirectWebsite from '../../../pages/Browser/ExternalWebsites/RedirectWebsite.ts';
import UniswapWebsite from '../../../pages/Browser/ExternalWebsites/UniswapWebsite.ts';
import OpenseaWebsite from '../../../pages/Browser/ExternalWebsites/OpenseaWebsite.ts';
import PancakeSwapWebsite from '../../../pages/Browser/ExternalWebsites/PancakeSwapWebsite.ts';
import DownloadFile from '../../../pages/Browser/DownloadFile.ts';
import DownloadFileWebsite from '../../../pages/Browser/ExternalWebsites/DownloadFileWebsite.ts';
import TestHelpers from '../../../helpers.js';
import CameraWebsite from '../../../pages/Browser/ExternalWebsites/Security/CameraWebsite.ts';
import HistoryDisclosureWebsite from '../../../pages/Browser/ExternalWebsites/Security/HistoryDisclosureWebsite.ts';

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

  it('should test phishing sites', async () => {
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
      await DownloadFileWebsite.tapDownloadFileButton();
      await DownloadFile.verifyTapjackingAndClickDownloadButton();
      await DownloadFile.verifySuccessStateVisible();
    });
  }

  //Skipped due to changes on Uniswap website that requires the test to be fixed
  it.skip('Should connect to Uniswap', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.UNISWAP_WEBSITE);
      await UniswapWebsite.tapConnectButton();
      await UniswapWebsite.tapOtherWalletsButton();
      await UniswapWebsite.tapMetaMaskWalletOptionButton();
      await ConnectBottomSheet.tapConnectButton();
      // Click Select a token button which is displayed only if the wallet is connected
      await UniswapWebsite.tapSelectTokenButton();
    });
  });

  it('Should connect to Opensea', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.OPENSEA_WEBSITE);
      await OpenseaWebsite.tapGetStartedButton();
      await OpenseaWebsite.tapCloseButton();
      await OpenseaWebsite.tapConnectButton();
      await OpenseaWebsite.tapMetaMaskOptionButton();
      await OpenseaWebsite.tapEthereumButton();
      await ConnectBottomSheet.tapConnectButton();
      // Click Notifications button which is displayed only if the wallet is connected
      await OpenseaWebsite.tapNotificationButton();
    });
  });

  // Skipped flaky test as pancake swap sometimes takes too long to load the website
  it.skip('Should connect to PancakeSwap', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });

      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.PANCAKESWAP_WEBSITE);
      await PancakeSwapWebsite.tapConnectButton();
      await PancakeSwapWebsite.tapMetaMaskButton();
      await ConnectBottomSheet.tapConnectButton();
      // Click Enter an amount button which is displayed only if the wallet is connected
      await PancakeSwapWebsite.tapEnterAmountButton();
    });
  });

  it('Should open ENS website', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.ENS_WEBSITE);
      if (device.getPlatform() === 'android') {
        // Due to additional redirects in ENS website we need to wait on Android for the element to appear in DOM
        await TestHelpers.delay(1000);
      }
      // Click General to interact with vitalik website and make sure it's loaded
      await EnsWebsite.tapGeneralButton();
    });
  });

  it('Should display redirected URL after redirect on website', async () => {
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
      await RedirectWebsite.tapRedirectButton();
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

  it('Should display camera permission when website is requesting access to camera', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.SECURITY_CAMERA_WEBSITE);
      await CameraWebsite.verifyRequestPermissionDialogVisible();
    });
  });

  it('Should not disclosure history of visited websites', async () => {
    await withBrowser(async () => {
      await Assertions.expectElementToBeVisible(Browser.browserScreenID, {
        description: 'Browser screen is visible',
      });
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.UNISWAP_WEBSITE);
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(ExternalSites.HISTORY_DISCLOSURE_WEBSITE);
      await HistoryDisclosureWebsite.verifyUniswapElementNotExist();
    });
  });
});
