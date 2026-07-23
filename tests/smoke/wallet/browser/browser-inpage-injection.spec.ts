// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { SmokeBrowser } from '../../../tags.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { DappVariants } from '../../../framework/Constants';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils';
import { loginToApp } from '../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../flows/browser.flow';
import Browser from '../../../page-objects/Browser/BrowserView';
import DocumentStartDapp from '../../../page-objects/Browser/DocumentStartDapp';

const INPAGE_INJECTION_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/inpage-injection',
);

describe(SmokeBrowser('Browser Inpage Injection'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('injects window.ethereum before the first dapp script runs', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
            dappPath: INPAGE_INJECTION_FIXTURES_PATH,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();

        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(`${getDappUrl(0)}/document-start.html`);

        await DocumentStartDapp.expectEthereumAvailableBeforeFirstInlineScript();
      },
    );
  });
});
