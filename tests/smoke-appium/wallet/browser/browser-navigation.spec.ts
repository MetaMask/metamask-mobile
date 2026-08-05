// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { test as appiumTest } from '../../../framework/fixtures/playwright/index.js';
import { SmokeBrowser } from '../../../tags.js';
import { loginToAppPlaywright } from '../../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../../flows/browser.flow.js';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.js';
import {
  getDappUrl,
  getMockServerPort,
  getMockServerPortForFixture,
} from '../../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../../framework/Constants.js';
import Browser from '../../../page-objects/Browser/BrowserView.js';
import EnsWebsite from '../../../page-objects/Browser/ExternalWebsites/EnsWebsite.js';
import RedirectWebsite from '../../../page-objects/Browser/ExternalWebsites/RedirectWebsite.js';
import { Assertions, Utilities } from '../../../framework/index.js';
import { PlatformDetector } from '../../../framework/PlatformLocator.js';
import { TestSpecificMock } from '../../../framework/types.js';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers.js';
import {
  ENS_IPFS_CID_V0,
  ensResolutionMock,
} from '../../../api-mocking/mock-responses/ens-resolution-mocks.js';

const INVALID_URL = 'https://quackquakc.easq';

/**
 * Mocks the invalid URL request so it doesn't trigger the unmocked-request guard.
 * Also provides a catch-all for background HyperLiquid API calls not covered by defaults.
 */
const invalidUrlMock: TestSpecificMock = async (mockServer) => {
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: INVALID_URL,
    response: '',
    responseCode: 404,
  });

  await setupMockRequest(mockServer, {
    requestMethod: 'POST',
    url: 'https://api.hyperliquid.xyz/info',
    response: {},
    responseCode: 200,
  });
};

const NAVIGATION_FIXTURES_PATH = path.resolve(
  __dirname,
  '../../../fixtures/navigation',
);

/**
 * Extract the origin from a URL string.
 * Falls back to a regex approach for invalid URLs.
 */
const getOriginFromURL = (url: string): string => {
  try {
    const urlObj = new URL(url);
    return urlObj.origin;
  } catch {
    const match = url.match(/^(?:https?:\/\/)?([^/]+)/i);
    return match ? match[1] : url;
  }
};

/** WebView URL after ENS resolves through the mock IPFS gateway. */
const getEnsFixturePageUrl = (): string => {
  const port = PlatformDetector.isAndroid()
    ? getMockServerPortForFixture()
    : getMockServerPort();
  return `http://localhost:${port}/ipfs/${ENS_IPFS_CID_V0}/`;
};

appiumTest.describe(SmokeBrowser('Browser Navigation'), () => {
  appiumTest.describe.configure({ timeout: 150000 });

  appiumTest(
    'navigates back home after visiting an invalid URL',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: invalidUrlMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.tapBottomSearchBar();
          await Browser.navigateToURL(INVALID_URL);
          await Browser.tapReturnHomeButton();
          await Browser.expectUrlNotEqualTo(getOriginFromURL(INVALID_URL));
        },
      );
    },
  );

  appiumTest(
    'resolves and displays ENS website (vitalik.eth)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const ensTestMock: TestSpecificMock = async (mockServer) => {
        await ensResolutionMock(mockServer);
        await setupMockRequest(mockServer, {
          requestMethod: 'POST',
          url: 'https://api.hyperliquid.xyz/info',
          response: {},
          responseCode: 200,
        });
      };

      // Point ipfsGateway at the mock server so the WebView loads our
      // fixture HTML instead of fetching from the real dweb.link gateway.
      // The port 8000 placeholder is replaced with the actual mock server
      // port at runtime by updateMockServerUrlsInFixture (iOS).
      const mockGateway = `http://localhost:${getMockServerPortForFixture()}/ipfs/`;

      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPreferencesController({ ipfsGateway: mockGateway })
            .build(),
          restartDevice: true,
          currentDeviceDetails,
          testSpecificMock: ensTestMock,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          // Bare ENS names must go through the URL bar (not dapp:// deeplink).
          // Do not assert the URL bar text: BrowserTab only updates it when
          // unfocused, and even then it shows the origin — not the IPFS path
          // (same class of issue as MCWP-540). Success = page content loads.
          await Browser.navigateToURL('vitalik.eth', {
            skipUrlEditorDismissal: true,
          });
          await Utilities.executeWithRetry(
            async () => {
              await EnsWebsite.tapGeneralButton(getEnsFixturePageUrl());
            },
            {
              timeout: 60_000,
              interval: 2_000,
              description: 'wait for ENS page to load and tap General link',
            },
          );
        },
      );
    },
  );

  // Skipped: BrowserTab.handleSuccessfulPageResolution only updates the URL bar
  // when its onLoadEnd "started && ended" condition is met. For JS-initiated
  // cross-origin redirects (window.location.href) this condition is not
  // reliably satisfied, so the URL bar keeps showing the previous origin.
  // Re-enable once the app fixes URL bar updates after cross-origin
  // in-page navigations (MCWP-540)
  // TO-DO: Remove when bug fixed https://github.com/MetaMask/metamask-mobile/issues/33815.
  appiumTest.skip(
    'displays redirected URL after cross-origin redirect',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
              dappPath: NAVIGATION_FIXTURES_PATH,
            },
            {
              dappVariant: DappVariants.TEST_DAPP,
              dappPath: NAVIGATION_FIXTURES_PATH,
            },
          ],
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();

          // Build redirect URL with dynamic target from second dapp server
          const redirectTarget = encodeURIComponent(
            `${getDappUrl(1)}/redirect-target.html`,
          );
          const redirectUrl = `${getDappUrl(0)}/redirect.html?target=${redirectTarget}`;

          await Browser.tapUrlInputBox();
          await Browser.navigateToURL(redirectUrl);
          await Assertions.expectElementToHaveText(
            Browser.urlInputBoxID,
            getOriginFromURL(getDappUrl(0)),
            {
              description:
                'URL bar shows the origin of the initial redirect page',
            },
          );

          await RedirectWebsite.tapRedirectButton(redirectUrl);
          await Assertions.expectElementToHaveText(
            Browser.urlInputBoxID,
            getOriginFromURL(getDappUrl(1)),
            {
              description:
                'URL bar shows the origin of the redirect target page',
            },
          );
        },
      );
    },
  );
});
