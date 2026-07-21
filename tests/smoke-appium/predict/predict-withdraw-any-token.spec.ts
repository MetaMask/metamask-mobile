import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import {
  confirmationFeatureFlags,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  POLYMARKET_ACTIVITY_MOCKS,
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
  POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS,
  POLYMARKET_POLYGON_RELAY_POLLING_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import { openPredictWithdrawPayConfirmation } from '../../flows/predict.flow.js';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation.js';
import {
  loginForPredictTests,
  remoteFeatureFlagPerpsDisabledForPredictSmoke,
} from './helpers/predict-helpers.js';

// Enables the Predict "withdraw to any token" (MetaMask Pay) flow. When this
// flag is on, Withdraw routes to the shared CustomAmount confirmation instead
// of the legacy same-token withdraw path. The E2E remote-flag mock serves the
// unresolved LaunchDarkly config, so we provide the flat { default, overrides }
// shape that selectPayQuoteConfig reads directly.
const ENABLE_PREDICT_WITHDRAW_ANY_TOKEN = {
  confirmations_pay_post_quote: {
    default: { enabled: true, tokens: {} },
    overrides: {
      predictWithdraw: {
        enabled: true,
        tokens: {
          '0x89': ['0x2791bca1f2de4661ed88a30c99a7a9449aa84174'],
          '0x1': ['0x0000000000000000000000000000000000000000'],
        },
      },
    },
  },
};

const setupPredictWithdrawAnyTokenMocks = async (mockServer: Mockttp) => {
  await POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS(mockServer);
  await POLYMARKET_POLYGON_RELAY_POLLING_MOCKS(mockServer);
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPerpsDisabledForPredictSmoke(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationFeatureFlags),
    ...ENABLE_PREDICT_WITHDRAW_ANY_TOKEN,
    carouselBanners: false,
    predictExtendedSportsMarkets: {
      versions: {
        '7.82.0': {
          enabled: false,
          leagues: [],
          enabledSportsMarketTypes: [],
        },
      },
    },
  });
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer);
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await POLYMARKET_ACTIVITY_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false);
  await POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS(mockServer);
};

appiumTest.describe(
  SmokePredictions('Predict - Withdraw to any token (MetaMask Pay)'),
  () => {
    appiumTest(
      'reaches the MetaMask Pay withdraw confirmation',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withFixtures(
          {
            fixture: new FixtureBuilder()
              .withPolygon()
              .withTokens(
                [
                  {
                    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
                    decimals: 6,
                    name: 'USD Coin (PoS)',
                    symbol: 'USDC.e',
                  },
                ],
                CHAIN_IDS.POLYGON,
              )
              .withDisabledSmartTransactions()
              .build(),
            restartDevice: true,
            disableLocalNodes: true,
            testSpecificMock: setupPredictWithdrawAnyTokenMocks,
            currentDeviceDetails,
          },
          async () => {
            await loginForPredictTests();

            // Open Predict and tap Withdraw until the MetaMask Pay custom-amount
            // confirmation is reached — proving the new withdraw-to-any-token
            // flow, not the legacy same-token withdraw path.
            await openPredictWithdrawPayConfirmation();

            // New-flow marker: available balance renders on PredictWithdrawInfo
            // (shared CustomAmount confirmation), not on a non-confirm screen.
            await TransactionPayConfirmation.verifyAvailableBalanceVisible();
          },
        );
      },
    );
  },
);
