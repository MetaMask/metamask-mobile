import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictUnavailableView from '../../pages/Predict/PredictUnavailableView';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import {
  POLYMARKET_MARKET_FEEDS_MOCKS,
  POLYMARKET_COMPLETE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';

// Base: enable the Predictions feature flag and force Polymarket geoblock
const setupGeoBlockedBase = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: true },
  });
};

const PredictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupGeoBlockedBase(mockServer);
};

const PredictionGeoBlockedWithPositionsFeature = async (
  mockServer: Mockttp,
) => {
  await setupGeoBlockedBase(mockServer);
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(SmokePredictions('Predictions - Geo Restriction'), () => {
  it('displays geo restriction modal when in US region', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionGeoBlockedFeature,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });
        await PredictMarketList.tapCategoryTab('new');
        await PredictMarketList.tapYesBasedOnCategoryAndIndex('new', 1);
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
        await PredictMarketList.tapNoBasedOnCategoryAndIndex('new', 1);
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
      },
    );
  });

  it('blocks cash out from positions in geo-restricted region', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionGeoBlockedWithPositionsFeature,
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnPredictionsTab();
        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
          { description: 'Predictions tab container is visible' },
        );
        await WalletView.tapOnPredictionsPosition('Spurs vs. Pelicans');
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Predict details screen is visible',
          },
        );
        await PredictDetailsPage.tapPositionsTab();
        await PredictDetailsPage.tapCashOutButton();
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();
      },
    );
  });
});
