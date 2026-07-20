import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { Assertions } from '../../framework/index.js';
import {
  remoteFeatureFlagPredictEnabled,
  confirmationFeatureFlags,
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
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import PredictBalance from '../../page-objects/Predict/PredictBalance.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation.js';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions.js';
import {
  loginForPredictTests,
  remoteFeatureFlagPerpsDisabledForPredictSmoke,
} from './helpers/predict-helpers.js';

const PREDICT_WITHDRAW_ANY_TOKEN_FLAGS = {
  confirmations_pay_post_quote: {
    default: { enabled: true, tokens: {} },
    overrides: {
      predictWithdraw: {
        enabled: true,
        tokens: {
          '0x1': ['0x0000000000000000000000000000000000000000'],
        },
      },
    },
  },
};

const setupPredictionMarketMocks = async (
  mockServer: Mockttp,
  flagOverrides: Record<string, unknown> = {},
) => {
  // Polygon predict withdraw publishes via EIP-7702 transaction relay, not Infura eth_sendRawTransaction.
  await POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS(mockServer);
  await POLYMARKET_POLYGON_RELAY_POLLING_MOCKS(mockServer);
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPerpsDisabledForPredictSmoke(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationFeatureFlags),
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
    ...flagOverrides,
  }); // we need to mock the confirmations redesign Feature flag
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Sets up all RPC mocks needed for withdraw flow
  // Keep this smoke test on the legacy Safe withdraw path.
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await POLYMARKET_ACTIVITY_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer); // needed to load the withdraw/deposit/claim screen
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings for claim flow
  await POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS(mockServer);
};

const PredictionMarketFeature = async (mockServer: Mockttp) =>
  setupPredictionMarketMocks(mockServer);

const PredictWithdrawAnyTokenFeature = async (mockServer: Mockttp) =>
  setupPredictionMarketMocks(mockServer, PREDICT_WITHDRAW_ANY_TOKEN_FLAGS);

appiumTest.describe(SmokePredictions('Predictions Withdraw'), () => {
  appiumTest(
    'withdraws from Predict balance',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            // Polygon bridged USDC must be in TokenController so confirmation's
            // useUpdateTokenAmount gets decimals=6. Otherwise decimals fall back to 18 and
            // "5" USDC is encoded as 5e18 raw — Predict signWithdraw then throws
            // "Decoded USDC amount is invalid or too large".
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
            // STX + sendBundle on Polygon would skip Delegation7702PublishHook and use the
            // smart-transaction publish path (not covered by POLYMARKET_TRANSACTION_SENTINEL_MOCKS).
            .withDisabledSmartTransactions()
            .build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: PredictionMarketFeature,
          currentDeviceDetails,
        },
        async () => {
          await loginForPredictTests();

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();

          await PredictMarketList.waitForScreenToDisplay({
            description: 'Predict market list container should be visible',
          });
          await PredictBalance.expectBalanceCardVisible();
          await PredictBalance.tapWithdraw();

          await TransactionPayConfirmation.tapKeyboardAmount('5');
          await TransactionPayConfirmation.tapKeyboardContinueButton();
          await FooterActions.tapConfirmButton();

          await PredictMarketList.waitForScreenToDisplay({
            description:
              'Predict market list should be visible after withdraw confirmation',
          });
        },
      );
    },
  );

  appiumTest(
    'selects another token for a Predict withdrawal',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withPopularNetworks()
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
          testSpecificMock: PredictWithdrawAnyTokenFeature,
          currentDeviceDetails,
        },
        async () => {
          await loginForPredictTests();

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();

          await PredictMarketList.waitForScreenToDisplay({
            description: 'Predict market list container should be visible',
          });
          await PredictBalance.expectBalanceCardVisible();
          await PredictBalance.tapWithdraw();

          await TransactionPayConfirmation.tapPayWithRow();
          await TransactionPayConfirmation.tapByNetworkFilter('Ethereum');
          await TransactionPayConfirmation.tapPayWithToken('ETH');
          await TransactionPayConfirmation.verifyPayWithSymbol('ETH');
        },
      );
    },
  );
});
