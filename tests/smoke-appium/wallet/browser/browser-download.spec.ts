// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import {
  test as appiumTest,
  type CurrentDeviceDetails,
} from '../../../framework/fixtures/playwright/index.js';
import { SmokeBrowser } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import {
  getDappUrl,
  getDappUrlForFixture,
} from '../../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../../framework/Constants.js';
import DownloadFileWebsite from '../../../page-objects/Browser/ExternalWebsites/DownloadFileWebsite.js';
import DownloadFile from '../../../page-objects/Browser/DownloadFile.js';

const DOWNLOAD_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/download',
);

async function testDownloadFile(
  filename: string,
  currentDeviceDetails: CurrentDeviceDetails,
): Promise<void> {
  await withFixtures(
    {
      dapps: [
        {
          dappVariant: DappVariants.TEST_DAPP,
          dappPath: DOWNLOAD_FIXTURES_PATH,
        },
      ],
      // Prefill the browser tab so Appium can skip flaky http:// URL-bar entry.
      fixture: (() => {
        const built = new FixtureBuilder().build();
        built.state.browser.tabs[0].url = `${getDappUrlForFixture(0)}/${filename}`;
        return built;
      })(),
      restartDevice: true,
      currentDeviceDetails,
    },
    async () => {
      // Port is allocated by withFixtures — resolve URL inside the callback.
      const pageUrl = `${getDappUrl(0)}/${filename}`;

      await loginToAppPlaywright({ scenarioType: 'e2e' });
      await navigateToBrowserView();
      // Fixture tab already loads the download page; tap the WebView button.
      await DownloadFileWebsite.tapDownloadFileButton(pageUrl);
      await DownloadFile.verifyTapjackingAndClickDownloadButton();
      await DownloadFile.verifySuccessStateVisible();
    },
  );
}

appiumTest.describe(SmokeBrowser('Browser File Download'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'downloads a blob file',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await testDownloadFile('download_blob_file.html', currentDeviceDetails);
    },
  );

  appiumTest(
    'downloads a base64 file',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await testDownloadFile('download_base64_file.html', currentDeviceDetails);
    },
  );
});
