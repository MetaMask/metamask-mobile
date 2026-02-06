import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../../e2e/tags';
import { loginToApp } from '../../../e2e/viewHelper';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../../e2e/pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList';
import Assertions from '../../framework/Assertions';
import { POLYMARKET_API_DOWN } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';

import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';

const testSpecificMock = async (mockServer: Mockttp) => {
  await POLYMARKET_API_DOWN(mockServer);
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
};

describe(SmokePredictions('Prediction markets'), () => {
  it('should verify feed is empty when API is down', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        // Navigate to actions
        await TabBarComponent.tapActions();

        await WalletActionsBottomSheet.tapPredictButton();

        await Assertions.expectElementToNotBeVisible(
          PredictMarketList.getMarketCard('trending', 2),
          {
            description: 'Prediction market feed should not be visible',
          },
        );
      },
    );
  });
});
