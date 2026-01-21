import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_CASH_OUT_MOCKS,
  POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictCashOutPage from '../../page-objects/Predict/PredictCashOutPage';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails';
import { getEventsPayloads } from '../wallet/analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';

/*
Test Scenario: Cash out on open position - Spurs vs. Pelicans
  Verifies the cash out flow for a predictions position:
  1. Navigate to Predictions tab and verify balance is $28.16
  2. Open Spurs vs. Pelicans position details
  3. Cash out the position with updated mocks
  4. Verify cash out appears in Activities tab
  */
const positionDetails = {
  name: 'Spurs vs. Pelicans',
  cashOutValue: '$30.75',
  initialBalance: '$28.16',
  newBalance: '$58.66',
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
  it('should cash out on open position: Spurs vs. Pelicans', async () => {
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
        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );
        // Current balance prior to cashing out
        await Assertions.expectTextDisplayed(positionDetails.initialBalance);
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsPosition(positionDetails.name);

        await Assertions.expectElementToBeVisible(PredictDetailsPage.container);
        await PredictDetailsPage.tapPositionsTab();
        // Set up cash out mocks before tapping cash out
        // POLYMARKET_POST_CASH_OUT_MOCKS handles both the transaction API and balance refresh
        await POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS(mockServer);
        await POLYMARKET_POST_CASH_OUT_MOCKS(mockServer);

        await PredictDetailsPage.tapCashOutButton();
        await Assertions.expectElementToBeVisible(PredictCashOutPage.container);

        await Assertions.expectElementToBeVisible(
          PredictCashOutPage.cashOutButton,
        );

        await PredictCashOutPage.tapCashOutButton();

        await PredictDetailsPage.tapBackButton();
        await device.enableSynchronization();

        await Assertions.expectTextDisplayed(positionDetails.newBalance, {
          description: 'Predictions balance should be updated to $58.16',
        });
        // Check that Spurs vs Pelicans is removed from current positions list
        for (let i = 0; i < 4; i++) {
          const positionCard =
            WalletView.getPredictCurrentPositionCardByIndex(i);
          await Assertions.expectElementToNotHaveText(
            positionCard,
            positionDetails.name,
            {
              description: `Position card at index ${i} should not have text "${positionDetails.name}"`,
            },
          );
        }
        await TabBarComponent.tapActivity();

        await ActivitiesView.tapOnPredictionsTab();
        await Assertions.expectTextDisplayed('Cashed out');
        await ActivitiesView.tapPredictPosition(positionDetails.name);
        await Assertions.expectElementToBeVisible(
          PredictActivityDetails.container,
        );
        await Assertions.expectTextDisplayed(positionDetails.cashOutValue);

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
