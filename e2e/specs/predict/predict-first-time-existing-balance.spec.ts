import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { setupMockRequest } from '../../api-mocking/helpers/mockHelpers';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import {
  PredictPositionsSelectorsIDs,
  PredictBalanceSelectorsIDs,
} from '../../selectors/Predict/Predict.selectors';

const PredictionFirstTimeExistingBalance = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );

  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: 'https://polymarket.com/api/geoblock',
    responseCode: 200,
    response: { blocked: false },
  });

  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(
  RegressionTrade('Predictions - First-time user with existing balance'),
  () => {
    it('loads Predict feed and displays balance for existing PM account', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          restartDevice: true,
          testSpecificMock: PredictionFirstTimeExistingBalance,
          skipReactNativeReload: true,
        },
        async () => {
          await loginToApp();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description: 'Predict market list container should be visible',
            },
          );
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description: 'Predict balance card should be visible',
            },
          );
        },
      );
    });

    it('loads Wallet > Predictions tab and displays balance and positions', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          testSpecificMock: PredictionFirstTimeExistingBalance,
          skipReactNativeReload: true,
        },
        async () => {
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet container should be visible',
          });
          await WalletView.tapOnPredictionsTab();
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description:
                'Predict balance card should be visible on Wallet > Predictions',
            },
          );
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(
              PredictPositionsSelectorsIDs.CLAIMABLE_POSITIONS_LIST,
            ),
            {
              description:
                'Claimable positions list should be visible on Wallet > Predictions',
            },
          );
        },
      );
    });
  },
);
