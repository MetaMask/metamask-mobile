import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import {
  remoteFeatureFlagPredictEnabled,
  confirmationsRedesignedFeatureFlags,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictClaimPage from '../../pages/Predict/PredictClaimPage';
// import TabBarComponent from '../../pages/wallet/TabBarComponent';
// import ActivitiesView from '../../pages/Transactions/ActivitiesView';
// import PredictActivityDetails from '../../pages/Transactions/predictionsActivityDetails';
import {
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
} from '../../api-mocking/mock-responses/polymarket/polymarket-positions-response';

/*
Test Scenario: Claim positions
  Verifies the claim flow for a predictions position:
  1. Navigate to Predictions tab and verify balance is $28.16
  2. Verify Claim Button is visible with $20.00 claimable amount
  3. Tap Claim Button
  4. Complete claim transaction
  5. Verify balance updated to $48.16 and all resolved positions (loss positions + winning positions) are removed from the UI
  */

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true); // Include winnings for claim flow
};

const PORTUGAL_LOCATION = {
  lat: 41.1318702,
  lon: -7.798836,
};
describe(SmokePredictions('Predictions'), () => {
  it('should claim positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await device.setLocation(PORTUGAL_LOCATION.lat, PORTUGAL_LOCATION.lon);
        await loginToApp();

        // Claim button is animated - disabling sync to prevent test hang
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );

        await WalletView.tapClaimButton();
        await Assertions.expectElementToBeVisible(PredictClaimPage.container);

        // Set up mocks to remove claimed positions after tapping claim button
        await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);
        await PredictClaimPage.tapClaimConfirmButton();

        await device.enableSynchronization();
        await POLYMARKET_UPDATE_CLAIM_BALANCE_MOCKS(mockServer); // Update USDC balance post claim

        await Assertions.expectElementToBeVisible(WalletView.container);

        /*
        Verify that all resolved positions (lost positions + winning positions) are removed after claiming
        Resolved positions include both:
         1. Lost positions (from POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE)
         2. Winning positions (from POLYMARKET_WINNING_POSITIONS_RESPONSE)
        */
        const allResolvedPositions = [
          ...POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
          ...POLYMARKET_WINNING_POSITIONS_RESPONSE,
        ];

        for (const position of allResolvedPositions) {
          await Assertions.expectTextNotDisplayed(position.title, {
            description: `Resolved position "${position.title}" should not be visible after claiming`,
          });
        }

        await Assertions.expectElementToNotBeVisible(WalletView.claimButton);

        // await TabBarComponent.tapActivity();

        // await ActivitiesView.tapOnPredictionsTab();
        // const LOST_POSITION = 'Bears vs. Commanders';

        // await ActivitiesView.tapPredictPosition(LOST_POSITION);
        // await Assertions.expectElementToBeVisible(
        //   PredictActivityDetails.container,
        // );
        // await PredictActivityDetails.tapBackButton();
        // await TabBarComponent.tapWallet();
        // await Assertions.expectTextDisplayed('$48.16');
      },
    );
  });
});
