// eslint-disable-next-line import-x/no-nodejs-modules
import path from 'path';
import { SmokeWalletPlatform } from '../../../tags.js';
import { loginToApp } from '../../../flows/wallet.flow';
import { navigateToBrowserView } from '../../../flows/browser.flow';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import {
  getDappUrl,
  getMockServerPortForFixture,
} from '../../../framework/fixtures/FixtureUtils';
import { DappVariants } from '../../../framework/Constants';
import Browser from '../../../page-objects/Browser/BrowserView';
import EnsWebsite from '../../../page-objects/Browser/ExternalWebsites/EnsWebsite';
import { Assertions } from '../../../framework';
import { TestSpecificMock } from '../../../framework/types';
import { setupMockRequest } from '../../../api-mocking/helpers/mockHelpers';
import TestHelpers from '../../../helpers.js';
import { ensResolutionMock } from '../../../api-mocking/mock-responses/ens-resolution-mocks';

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

describe(SmokeWalletPlatform('Browser Navigation'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should navigate back home after visiting an invalid URL', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: invalidUrlMock,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.tapBottomSearchBar();
        await Browser.navigateToURL(INVALID_URL);
        await Browser.tapReturnHomeButton();
        await Browser.expectUrlNotEqualTo(getOriginFromURL(INVALID_URL));
      },
    );
  });

  it('should resolve and display ENS website (vitalik.eth)', async () => {
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
    // port at runtime by updateMockServerUrlsInFixture.
    const mockGateway = `http://localhost:${getMockServerPortForFixture()}/ipfs/`;

    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPreferencesController({ ipfsGateway: mockGateway })
          .build(),
        restartDevice: true,
        testSpecificMock: ensTestMock,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await Browser.tapUrlInputBox();
        await Browser.navigateToURL('vitalik.eth');
        // ENS resolution + IPFS gateway fetch takes time
        await TestHelpers.delay(5000);
        await EnsWebsite.tapGeneralButton();
      },
    );
  });

  it('should display redirected URL after cross-origin redirect', async () => {
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
      },
      async () => {
        await loginToApp();
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

        // Navigate via runScript — Detox's WebView tap() does not
        // reliably fire JavaScript handlers on <button> elements.
        const targetUrl = `${getDappUrl(1)}/redirect-target.html`;
        const body = web(by.id('browser-webview')).element(
          by.web.cssSelector('body'),
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (body as any).runScript(
          `(el) => { window.location.href = '${targetUrl}'; }`,
        );
        await Assertions.expectElementToHaveText(
          Browser.urlInputBoxID,
          getOriginFromURL(getDappUrl(1)),
          {
            description: 'URL bar shows the origin of the redirect target page',
          },
        );
      },
    );
  });
});
