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
import PredictActivityDetails from '../../pages/Transactions/predictionsActivityDetails';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';

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
        fixture: new FixtureBuilder()
          .withPolygon()
          .withMetaMetricsOptIn()
          .build(),
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

        /*
        When opening a position, the balance is optimistically updated in PredictController
        with a cache valid for 5 seconds. When getBalance() is called after cache expiration
        it invalidates the NetworkController's block cache and
        makes a fresh RPC balance request. The mock is placed here to
        verify that when the cache expires and a balance refresh request
        is made, it successfully returns the updated balance.
       */
        await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'open-position');

        await PredictActivityDetails.tapBackButton();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectTextDisplayed(positionDetails.newBalance);

        // Verify analytics events
        const events = await getEventsPayloads(mockServer);
        const softAssert = new SoftAssert();

        const expectedEvents = {
          MARKET_DETAILS_OPENED: 'Predict Market Details Opened',
          POSITION_VIEWED: 'Predict Position Viewed',
          ACTIVITY_VIEWED: 'Predict Activity Viewed',
        };

        // Event 1: PREDICT_MARKET_DETAILS_OPENED
        await softAssert.checkAndCollect(async () => {
          const marketDetailsOpened = events.filter(
            (event) => event.event === expectedEvents.MARKET_DETAILS_OPENED,
          );
          await Assertions.checkIfValueIsDefined(marketDetailsOpened);
          if (marketDetailsOpened.length > 0) {
            await Assertions.checkIfValueIsDefined(
              marketDetailsOpened[0].properties.entry_point,
            );
            await Assertions.checkIfValueIsDefined(
              marketDetailsOpened[0].properties.market_details_viewed,
            );
          }
        }, 'Market Details Opened event should be tracked');

        // Event 2: PREDICT_POSITION_VIEWED
        await softAssert.checkAndCollect(async () => {
          const positionViewed = events.filter(
            (event) => event.event === expectedEvents.POSITION_VIEWED,
          );
          await Assertions.checkIfValueIsDefined(positionViewed);
          if (positionViewed.length > 0) {
            await Assertions.checkIfValueIsDefined(
              positionViewed[0].properties.open_positions_count,
            );
          }
        }, 'Position Viewed event should be tracked');

        // Event 3: PREDICT_ACTIVITY_VIEWED
        await softAssert.checkAndCollect(async () => {
          const activityViewed = events.filter(
            (event) => event.event === expectedEvents.ACTIVITY_VIEWED,
          );
          await Assertions.checkIfValueIsDefined(activityViewed);
          if (activityViewed.length > 0) {
            await Assertions.checkIfObjectContains(
              activityViewed[0].properties,
              {
                activity_type: 'activity_list',
              },
            );
          }
        }, 'Activity Viewed event should be tracked');

        softAssert.throwIfErrors();
      },
    );
  });
});
