/**
 * Phase 0 spike: prove iOS Appium can call window.ethereum.request in the
 * in-app Test Dapp WebView (fire-and-poll transport).
 *
 * Excluded from Appium smoke tag suites via playwright testIgnore.
 * Run explicitly with APPIUM_RUN_API_SPECS=1 yarn test:api-specs (or the
 * matching playwright command for this file under ios-smoke).
 */
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { getDappUrl } from '../../framework/fixtures/FixtureUtils.js';
import { DappVariants } from '../../framework/Constants.js';
import Assertions from '../../framework/Assertions.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import {
  navigateToBrowserView,
  waitForTestDappToLoad,
} from '../../flows/browser.flow.js';
import Browser from '../../page-objects/Browser/BrowserView.js';
import { requestViaEthereumProvider } from './helpers/transport.js';

appiumTest.describe('API specs Phase 0 — ethereum WebView transport', () => {
  appiumTest.describe.configure({ timeout: 180000 });

  appiumTest(
    'returns eth_chainId via window.ethereum.request',
    async ({ driver: _driver, currentDeviceDetails }) => {
      appiumTest.skip(
        currentDeviceDetails.platform !== 'ios',
        'API specs WebView ethereum transport is iOS Appium only',
      );

      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await navigateToBrowserView();
          await Browser.navigateToTestDApp();
          await waitForTestDappToLoad();

          const pageUrl = getDappUrl(0);
          const response = await requestViaEthereumProvider(
            pageUrl,
            'eth_chainId',
            [],
          );

          if (response.error) {
            throw new Error(
              `eth_chainId failed: ${JSON.stringify(response.error)}`,
            );
          }

          const chainId = response.result;
          if (typeof chainId !== 'string' || !chainId.startsWith('0x')) {
            throw new Error(
              `Unexpected eth_chainId result: ${JSON.stringify(response)}`,
            );
          }

          // Default fixture is on Ethereum mainnet (0x1).
          await Assertions.checkIfTextMatches(chainId.toLowerCase(), '0x1');
        },
      );
    },
  );
});
