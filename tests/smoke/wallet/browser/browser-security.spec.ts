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
import CameraWebsite from '../../../page-objects/Browser/ExternalWebsites/Security/CameraWebsite';
import HistoryDisclosureWebsite from '../../../page-objects/Browser/ExternalWebsites/Security/HistoryDisclosureWebsite';

const SECURITY_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/security',
);

describe(SmokeBrowser('Browser Security'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('shows camera permission dialog when page requests camera access', async () => {
    // On Android, pre-grant the OS-level camera permission so only the
    // WebView permission dialog remains (Detox can interact with that one).
    const isAndroid = device.getPlatform() === 'android';
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
        ...(isAndroid && { permissions: { camera: 'YES' } }),
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(`${getDappUrl(0)}/camera.html`);
        await CameraWebsite.verifyRequestPermissionDialogVisible();
        await device.enableSynchronization();
      },
    );
  });

  it('does not disclose history of visited pages', async () => {
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
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();

        // Visit the target page first to seed browser history
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(`${getDappUrl(0)}/visited-target.html`);

        // Navigate to the attack page that attempts :visited CSS sniffing
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(`${getDappUrl(0)}/history-disclosure.html`);

        // Verify the browser did NOT leak that visited-target.html was visited
        await HistoryDisclosureWebsite.verifyVisitedTargetNotLeaked();
      },
    );
  });
});
