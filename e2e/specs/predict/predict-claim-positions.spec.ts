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
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
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
        await POLYMARKET_POST_CLAIM_MOCKS(mockServer);

        await loginToApp();
        await new Promise((resolve) => setTimeout(resolve, 9000));

        // Claim button is animated - disabling sync to prevent test hang
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );

        // Set up post-claim mocks before tapping claim button

        await WalletView.tapClaimButton();

        // TODO: Add additional assertions for claim confirmation screen
        // The claim flow UI is still in development

        await new Promise((resolve) => setTimeout(resolve, 9000));
      },
    );
  });
});
