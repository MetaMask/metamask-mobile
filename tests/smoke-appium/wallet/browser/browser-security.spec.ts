// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeBrowser } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../../framework/Constants.js';
import { PlatformDetector } from '../../../framework/PlatformLocator.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import CameraWebsite from '../../../page-objects/Browser/ExternalWebsites/Security/CameraWebsite.js';
import HistoryDisclosureWebsite from '../../../page-objects/Browser/ExternalWebsites/Security/HistoryDisclosureWebsite.js';

const SECURITY_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/security',
);

appiumTest.describe(SmokeBrowser('Browser Security'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'shows camera permission dialog when page requests camera access',
    async ({ driver: _driver, currentDeviceDetails }) => {
      // Android Appium cannot reliably drive this case today:
      // - WebView camera permission prompt is not reliably exposed in UiAutomator
      // - dapp:// load does not expose ALLOW / status in the UiAutomator tree
      // Covered on iOS Appium (autoAcceptAlerts + granted status)
      appiumTest.skip(
        PlatformDetector.isAndroid(),
        'Android Appium: WebView camera permission prompt is not reliably automatable',
      );

      // iOS Appium autoAcceptAlerts dismisses the WKWebView prompt; the page
      // object asserts the granted outcome instead of the dialog itself.
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
              dappPath: SECURITY_FIXTURES_PATH,
            },
          ],
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          const cameraPageUrl = `${getDappUrl(0)}/camera.html`;
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.navigateToURL(cameraPageUrl);
          await CameraWebsite.verifyRequestPermissionDialogVisible(
            cameraPageUrl,
          );
        },
      );
    },
  );

  appiumTest(
    'does not disclose history of visited pages',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
              dappPath: SECURITY_FIXTURES_PATH,
            },
          ],
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          const visitedTargetUrl = `${getDappUrl(0)}/visited-target.html`;
          const historyDisclosureUrl = `${getDappUrl(0)}/history-disclosure.html`;

          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();

          // Visit the target page first to seed browser history
          await Browser.tapUrlInputBox();
          await Browser.navigateToURL(visitedTargetUrl);

          // Navigate to the attack page that attempts :visited CSS sniffing
          await Browser.tapUrlInputBox();
          await Browser.navigateToURL(historyDisclosureUrl);

          // Verify the browser did NOT leak that visited-target.html was visited
          await HistoryDisclosureWebsite.verifyVisitedTargetNotLeaked(
            historyDisclosureUrl,
          );
        },
      );
    },
  );
});
