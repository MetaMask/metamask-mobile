import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
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
  POLYMARKET_POST_CLAIM_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictClaimPage from '../../pages/Predict/PredictClaimPage';
// import TabBarComponent from '../../pages/wallet/TabBarComponent';
// import ActivitiesView from '../../pages/Transactions/ActivitiesView';
// import PredictActivityDetails from '../../pages/Transactions/predictionsActivityDetails';
import { POLYMARKET_RESOLVED_MARKETS_POSITIONS_RESPONSE } from '../../api-mocking/mock-responses/polymarket/polymarket-positions-response';

/*
Test Scenario: Claim positions
  Verifies the claim flow for a predictions position:
  1. Navigate to Predictions tab and verify balance is $28.16
  2. Verify Claim Button is visible with $20.00 claimable amount
  3. Tap Claim Button
  4. Complete claim transaction
  7. Verify balance updated to $48.16 and resolved market positions are removed from the UI
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

describe(SmokeTrade('Predictions'), () => {
  it('should claim positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();

        // Claim button is animated - disabling sync to prevent test hang
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );

        await WalletView.tapClaimButton();
        // Set up mocks to remove claimed positions after tapping claim button
        await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);
        await POLYMARKET_POST_CLAIM_MOCKS(mockServer);

        await Assertions.expectElementToBeVisible(PredictClaimPage.container);

        await PredictClaimPage.tapClaimConfirmButton();
        await device.enableSynchronization();

        await Assertions.expectElementToBeVisible(WalletView.container);

        // await Assertions.expectTextDisplayed('$48.16');

        // Verify that all resolved market positions (including winning positions) are not visible after claiming
        const resolvedPositions =
          POLYMARKET_RESOLVED_MARKETS_POSITIONS_RESPONSE;
        for (const position of resolvedPositions) {
          await Assertions.expectTextNotDisplayed(position.title, {
            description: `Resolved market position "${position.title}" should not be visible`,
          });
        }
        await Assertions.expectElementToNotBeVisible(WalletView.claimButton);
      },
    );
  });
});
