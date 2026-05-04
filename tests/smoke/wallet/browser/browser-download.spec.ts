// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { SmokeBrowser } from '../../../tags.js';
import { loginToApp } from '../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../flows/browser.flow';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import Browser from '../../../page-objects/Browser/BrowserView';
import DownloadFileWebsite from '../../../page-objects/Browser/ExternalWebsites/DownloadFileWebsite';
import DownloadFile from '../../../page-objects/Browser/DownloadFile';

const DOWNLOAD_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/download',
);

async function testDownloadFile(filename: string) {
  await withFixtures(
    {
      dapps: [
        {
          dappVariant: DappVariants.TEST_DAPP,
          dappPath: DOWNLOAD_FIXTURES_PATH,
        },
      ],
      fixture: new FixtureBuilder().build(),
      restartDevice: true,
    },
    async () => {
      await loginToApp();
      await navigateToBrowserView();
      await Browser.tapUrlInputBox();
      await Browser.navigateToURL(`${getDappUrl(0)}/${filename}`);
      await DownloadFileWebsite.tapDownloadFileButton();
      await DownloadFile.verifyTapjackingAndClickDownloadButton();
      await DownloadFile.verifySuccessStateVisible();
    },
  );
}

describe(SmokeBrowser('Browser File Download'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('downloads a blob file', async () => {
    await testDownloadFile('download_blob_file.html');
  });

  it('downloads a base64 file', async () => {
    await testDownloadFile('download_base64_file.html');
  });
});
