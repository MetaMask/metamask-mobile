import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import { Assertions } from '../../framework';
import {
  remoteFeatureFlagHomepageSectionsV1Enabled,
  remoteFeatureFlagPredictEnabled,
  confirmationFeatureFlags,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS,
  POLYMARKET_POLYGON_RELAY_POLLING_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import PredictBalance from '../../page-objects/Predict/PredictBalance';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  // Polygon predict withdraw publishes via EIP-7702 transaction relay, not Infura eth_sendRawTransaction.
  await POLYMARKET_POLYGON_RELAY_NETWORK_FLAGS_MOCKS(mockServer);
  await POLYMARKET_POLYGON_RELAY_POLLING_MOCKS(mockServer);
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    ...Object.assign({}, ...confirmationFeatureFlags),
    carouselBanners: false,
    exploreSectionsOrder: {
      home: ['predictions', 'tokens', 'perps', 'stocks', 'sites'],
      quickActions: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
      search: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
    },
  }); // we need to mock the confirmations redesign Feature flag
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Sets up all RPC mocks needed for withdraw flow
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer); // needed to load the withdraw/deposit/claim screen
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings for claim flow
  await POLYMARKET_WITHDRAW_BALANCE_LOAD_MOCKS(mockServer);
};

describe(SmokePredictions('Predictions Withdraw'), () => {
  it('withdraws from Predict balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          // STX + sendBundle on Polygon would skip Delegation7702PublishHook and use the
          // smart-transaction publish path (not covered by POLYMARKET_TRANSACTION_SENTINEL_MOCKS).
          .withDisabledSmartTransactions()
          .build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictBalance.expectBalanceCardVisible();
        await PredictBalance.tapWithdraw();

        await TransactionPayConfirmation.tapKeyboardAmount('5');
        await TransactionPayConfirmation.tapKeyboardContinueButton();
        await FooterActions.tapConfirmButton();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description:
            'Predict market list should be visible after withdraw confirmation',
        });
      },
    );
  });
});
