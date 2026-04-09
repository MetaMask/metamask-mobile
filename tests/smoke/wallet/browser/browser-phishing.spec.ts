// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { Mockttp } from 'mockttp';
import { SmokeWalletPlatform } from '../../../tags.js';
import { loginToApp } from '../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../flows/browser.flow';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import { TestSpecificMock } from '../../../framework/types';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import Browser from '../../../page-objects/Browser/BrowserView';
import Assertions from '../../../framework/Assertions';

const PHISHING_TEST_DOMAIN = 'phishing-test.example.com';

const PHISHING_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/phishing',
);

/**
 * Creates a testSpecificMock that overrides the dapp-scanning API
 * to return BLOCK for the given domain, triggering the phishing modal.
 */
function createPhishingMock(domain: string): TestSpecificMock {
  return async (mockServer: Mockttp) => {
    // Mock the dapp-scanning API to return BLOCK for the domain
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: `dapp-scanning.api.cx.metamask.io/v2/scan?url=${domain}`,
      response: {
        domainName: domain,
        recommendedAction: 'BLOCK',
      },
      responseCode: 200,
    });

    // Mock the actual URL to prevent unmocked request errors.
    // The browser may fire the page request before phishing detection blocks it.
    await setupMockRequest(mockServer, {
      requestMethod: 'GET',
      url: `https://${domain}`,
      response: '',
      responseCode: 200,
    });
  };
}

describe(SmokeWalletPlatform('Browser Phishing Detection'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('shows phishing warning when navigating to a blocked site', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
            dappPath: PHISHING_FIXTURES_PATH,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: createPhishingMock(PHISHING_TEST_DOMAIN),
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();

        // Navigate to a local page that redirects to the phishing domain.
        // The redirect triggers dapp-scanning which returns BLOCK.
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(
          `${getDappUrl(0)}/redirect-to-phishing.html`,
        );

        await Assertions.expectElementToBeVisible(Browser.backToSafetyButton, {
          description: 'Phishing warning back to safety button is visible',
        });

        await Browser.tapBackToSafetyButton();

        await Assertions.expectElementToNotHaveText(
          Browser.urlInputBoxID,
          PHISHING_TEST_DOMAIN,
          {
            description:
              'URL input box does not contain phishing domain after going back to safety',
          },
        );
      },
    );
  });

  it('shows phishing warning when page contains a blocked iframe', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
            dappPath: PHISHING_FIXTURES_PATH,
          },
        ],
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: createPhishingMock(PHISHING_TEST_DOMAIN),
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();

        await Browser.tapUrlInputBox();
        await Browser.navigateToURL(`${getDappUrl(0)}/iframe-test.html`);

        await Assertions.expectElementToBeVisible(Browser.backToSafetyButton, {
          description:
            'Phishing warning back to safety button is visible for iframe',
        });

        await Browser.tapBackToSafetyButton();

        await Assertions.expectElementToNotHaveText(
          Browser.urlInputBoxID,
          'localhost',
          {
            description:
              'URL input box does not contain localhost after going back to safety',
          },
        );
      },
    );
  });
});
