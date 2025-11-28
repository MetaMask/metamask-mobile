import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_OPEN_POSITION_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';

/*
Test Scenario: Open position on Celtics vs. Nets market
  Verifies the open position flow for a predictions market:
  1. Navigate to Predictions tab and open market list
  2. Select Celtics vs. Nets market from sports category
  3. Open a position with $10 investment
  4. Verify position appears in Positions tab
  5. Verify balance updates to $17.76
  6. Verify position appears in Activities tab
*/
const positionDetails = {
  name: 'Celtics vs. Nets',
  positionAmount: '10',
  newBalance: '$17.76',
  category: 'sports' as const,
  marketIndex: 1,
};

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

describe(SmokePredictions('Predictions'), () => {
  it('opens position on Celtics vs. Nets market', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();

        await WalletView.tapOnPredictionsTab();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await device.disableSynchronization();

        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list container should be visible',
        });

        await PredictMarketList.tapCategoryTab(positionDetails.category);
        await PredictMarketList.tapMarketCard(
          positionDetails.category,
          positionDetails.marketIndex,
        );
        await PredictDetailsPage.tapOpenPositionValue();

        await POLYMARKET_POST_OPEN_POSITION_MOCKS(mockServer);
        await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'open-position');

        await PredictDetailsPage.tapPositionAmount(
          positionDetails.positionAmount,
        );
        await PredictDetailsPage.tapDoneButton();

        await PredictDetailsPage.tapOpenPosition();

        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.positionsTab,
          {
            description:
              'Position tab should appear after opening a new position',
          },
        );

        await Assertions.expectTextDisplayed(positionDetails.name, {
          description: 'Position card for Celtics vs. Nets should appear',
        });

        await PredictDetailsPage.tapBackButton();
        await Assertions.expectTextDisplayed(positionDetails.newBalance, {
          description: `USDC balance should display ${positionDetails.newBalance} after opening position`,
        });
        await PredictMarketList.tapBackButton();
        await device.enableSynchronization();

        // Verify position appears in current positions list on homepage

        await Assertions.expectTextDisplayed(positionDetails.name, {
          description: `Position card should have text "${positionDetails.name}"`,
        });

        await TabBarComponent.tapActivity();
        await ActivitiesView.tapOnPredictionsTab();
        await ActivitiesView.tapPredictPosition(positionDetails.name);
      },
    );
  });
});
