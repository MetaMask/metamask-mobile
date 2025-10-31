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
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

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

        // Set up post-claim mocks before tapping claim button

        await WalletView.tapClaimButton();
        // Set up mocks to remove claimed positions after tapping claim button
        await POLYMARKET_POST_CLAIM_MOCKS(mockServer);
        await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);

        await Assertions.expectElementToBeVisible(PredictClaimPage.container);

        await PredictClaimPage.tapClaimConfirmButton();
        await device.enableSynchronization();

        await Assertions.expectElementToBeVisible(WalletView.container);

        await TabBarComponent.tapActivity();

        await ActivitiesView.tapOnPredictionsTab();
        // await ActivitiesView.tapCashedOutPosition(positionDetails.name);
        await Assertions.expectTextDisplayed('Predicted');
        await TabBarComponent.tapWallet();
        await new Promise((resolve) => setTimeout(resolve, 9000));

        // await Assertions.expectTextDisplayed('$48.16');

        // await PredictTabView.scrollToBottom();
      },
    );
  });
});
