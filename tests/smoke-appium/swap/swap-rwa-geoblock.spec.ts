import { merge } from 'lodash';
import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSwap } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import { LocalNodeType } from '../../framework/types.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { getProductionRemoteFlagDefaults } from '../../feature-flags/index.js';
import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import QuoteView from '../../page-objects/swaps/QuoteView.js';
import { prepareSwapsTestEnvironment } from '../../helpers/swap/prepareSwapsTestEnvironment.js';
import { enterSwapQuote } from '../../helpers/swap/swap-unified-ui.js';
import {
  RWA_GEO_BLOCK_REMOTE_FEATURE_FLAG_OVERRIDES,
  rwaSwapGeoBlockTestSpecificMock,
} from '../../helpers/swap/swap-rwa-geoblock-mocks.js';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager.js';

const USDC_TO_GOOGLON_QUOTE = {
  quantity: '25',
  sourceTokenSymbol: 'USDC',
  destTokenSymbol: 'GOOGLON',
  chainId: '0x1',
} as const;

appiumTest.describe(SmokeSwap('Swap RWA Geo-block'), () => {
  appiumTest(
    'shows geo-restricted message when swapping USDC to GOOGLON in a blocked region',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixture = new FixtureBuilder()
        .withNetworkController({
          chainId: USDC_TO_GOOGLON_QUOTE.chainId,
          rpcUrl: `http://localhost:${DEFAULT_ANVIL_PORT}`,
          type: 'custom',
          nickname: 'Localhost',
          ticker: 'ETH',
        })
        .build();

      merge(fixture.state.engine.backgroundState, {
        RemoteFeatureFlagController: {
          remoteFeatureFlags: {
            ...getProductionRemoteFlagDefaults(),
            ...RWA_GEO_BLOCK_REMOTE_FEATURE_FLAG_OVERRIDES,
          },
        },
      });

      await withFixtures(
        {
          fixture,
          localNodeOptions: [
            {
              type: LocalNodeType.anvil,
              options: {
                chainId: 1,
                loadState: './tests/smoke-appium/swap/withTokens.json',
              },
            },
          ],
          testSpecificMock: rwaSwapGeoBlockTestSpecificMock,
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await prepareSwapsTestEnvironment();
          await WalletView.tapWalletSwapButton();

          await enterSwapQuote(
            USDC_TO_GOOGLON_QUOTE.quantity,
            USDC_TO_GOOGLON_QUOTE.sourceTokenSymbol,
            USDC_TO_GOOGLON_QUOTE.destTokenSymbol,
            USDC_TO_GOOGLON_QUOTE.chainId,
          );

          await QuoteView.checkRwaGeoRestrictedMessageIsDisplayed();
        },
      );
    },
  );
});
