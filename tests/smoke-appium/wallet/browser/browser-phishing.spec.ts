// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { Mockttp } from 'mockttp';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeBrowser } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import { getDappUrl } from '../../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../../framework/Constants.js';
import { TestSpecificMock } from '../../../framework/types.js';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import { Assertions } from '../../../framework/index.js';

const PHISHING_TEST_DOMAIN = 'phishing-test.example.com';
const PHISHING_TEST_ORIGIN = `https://${PHISHING_TEST_DOMAIN}`;
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

appiumTest.describe(SmokeBrowser('Browser Phishing Detection'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'shows phishing warning when navigating to a blocked site',
    async ({ driver: _driver, currentDeviceDetails }) => {
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
          currentDeviceDetails,
          testSpecificMock: createPhishingMock(PHISHING_TEST_DOMAIN),
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();

          // Navigate to a local page that redirects to the phishing domain.
          // The redirect triggers dapp-scanning which returns BLOCK.
          //
          // Skip URL editor dismissal after submit: phishing detection can
          // show the full-screen warning before Cancel is tapped. A forced
          // dismiss then races the modal (Cancel gone) and burns ~10–15s of
          // the 150s suite budget — enough to time out the post-Back-to-safety
          // URL assert when login/browser entry was already slow.
          await Browser.tapUrlInputBox();
          await Browser.navigateToURL(
            `${getDappUrl(0)}/redirect-to-phishing.html`,
            { skipUrlEditorDismissal: true },
          );
          await Assertions.expectElementToBeVisible(
            Browser.backToSafetyButton,
            {
              description: 'Phishing warning back to safety button is visible',
            },
          );
          await Browser.tapBackToSafetyButton();
          await Browser.expectUrlNotEqualTo(PHISHING_TEST_ORIGIN);
        },
      );
    },
  );

  appiumTest(
    'shows phishing warning when page contains a blocked iframe',
    async ({ driver: _driver, currentDeviceDetails }) => {
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
          currentDeviceDetails,
          testSpecificMock: createPhishingMock(PHISHING_TEST_DOMAIN),
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.tapUrlInputBox();
          // Skip URL editor dismissal — Cancel races the phishing modal; see
          // the redirect test comment above.
          await Browser.navigateToURL(`${getDappUrl(0)}/iframe-test.html`, {
            skipUrlEditorDismissal: true,
          });
          await Assertions.expectElementToBeVisible(
            Browser.backToSafetyButton,
            {
              description:
                'Phishing warning back to safety button is visible for iframe',
            },
          );
          await Browser.tapBackToSafetyButton();
          await Browser.expectUrlNotEqualTo(getDappUrl(0));
        },
      );
    },
  );
});
