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
import PredictCashOutPage from '../../pages/Predict/PredictCashOutPage';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  POLYMARKET_MARKET_FEEDS_MOCKS,
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_GEO_BLOCKED_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../pages/Predict/PredictAddFunds';
import { getEventsPayloads } from '../analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';

//Enable the Predictions feature flag and force Polymarket geoblock
const setupGeoBlockedBase = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  await POLYMARKET_GEO_BLOCKED_MOCKS(mockServer);
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

describe(
  SmokePredictions('Predictions - Geo Restriction modal displays '),
  () => {
    it('when clicking Yes/No to the feeds', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
          restartDevice: true,
          testSpecificMock: PredictionGeoBlockedFeature,
        },
        async ({ mockServer }) => {
          await loginToApp();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description: 'Predict market list container should be visible',
            },
          );
          await PredictMarketList.tapCategoryTab('new');
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description:
                'Market list is visible prior to attempting a trade from feed',
            },
          );
          await PredictMarketList.tapYesBasedOnCategoryAndIndex('new', 1);
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
          await Assertions.expectElementToBeVisible(
            PredictMarketList.container,
            {
              description:
                'Returned to market list; modal was displayed over feed interaction',
            },
          );

          await PredictMarketList.tapNoBasedOnCategoryAndIndex('new', 1);
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();

          // Verify analytics events for geo-blocking
          const events = await getEventsPayloads(mockServer);
          const softAssert = new SoftAssert();

          await softAssert.checkAndCollect(async () => {
            const geoBlockedEvents = events.filter(
              (event) => event.event === 'Geo Blocked Triggered',
            );
            await Assertions.checkIfValueIsDefined(geoBlockedEvents);
            if (geoBlockedEvents.length > 0) {
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.country,
              );
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.attempted_action,
              );

              // Verify we captured predict_action events (Yes/No buttons)
              const attemptedActions = geoBlockedEvents.map(
                (e) => e.properties.attempted_action,
              );
              const hasPredictAction =
                attemptedActions.includes('predict_action');

              if (!hasPredictAction) {
                throw new Error(
                  `Expected predict_action in geo-blocked events. Found: ${attemptedActions.join(', ')}`,
                );
              }
            }
          }, 'Geo Blocked events should be tracked for predict actions (Yes/No)');

          softAssert.throwIfErrors();
        },
      );
    });

    it('when clicking on cash out under positions', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          testSpecificMock: PredictionGeoBlockedWithPositionsFeature,
        },
        async ({ mockServer }) => {
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
          await Assertions.expectElementToNotBeVisible(
            PredictCashOutPage.container,
            {
              description:
                'Sell Preview should not open; Unavailable modal should be shown instead due to geo restriction',
            },
          );
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();

          // Verify analytics events for geo-blocking
          const events = await getEventsPayloads(mockServer);
          const softAssert = new SoftAssert();

          await softAssert.checkAndCollect(async () => {
            const geoBlockedEvents = events.filter(
              (event) => event.event === 'Geo Blocked Triggered',
            );
            await Assertions.checkIfValueIsDefined(geoBlockedEvents);
            if (geoBlockedEvents.length > 0) {
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.country,
              );
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.attempted_action,
              );

              // Verify we captured cashout event
              const attemptedActions = geoBlockedEvents.map(
                (e) => e.properties.attempted_action,
              );
              const hasCashoutAction = attemptedActions.includes('cashout');

              if (!hasCashoutAction) {
                throw new Error(
                  `Expected cashout in geo-blocked events. Found: ${attemptedActions.join(', ')}`,
                );
              }
            }
          }, 'Geo Blocked event should be tracked for cashout action');

          softAssert.throwIfErrors();
        },
      );
    });

    it('when clicking Add funds from the Predictions balance', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withMetaMetricsOptIn().build(),
          restartDevice: true,
          testSpecificMock: PredictionGeoBlockedFeature,
        },
        async ({ mockServer }) => {
          await loginToApp();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.balanceCard,
            {
              description: 'Predict balance card is visible',
            },
          );

          await PredictAddFunds.tapAddFunds();
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.balanceCard,
            {
              description:
                'Returned to Predictions tab; Unavailable modal dismissed after clicking Add funds',
            },
          );

          // Verify analytics events for geo-blocking
          const events = await getEventsPayloads(mockServer);
          const softAssert = new SoftAssert();

          await softAssert.checkAndCollect(async () => {
            const geoBlockedEvents = events.filter(
              (event) => event.event === 'Geo Blocked Triggered',
            );
            await Assertions.checkIfValueIsDefined(geoBlockedEvents);
            if (geoBlockedEvents.length > 0) {
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.country,
              );
              await Assertions.checkIfValueIsDefined(
                geoBlockedEvents[0].properties.attempted_action,
              );

              // Verify we captured deposit event
              const attemptedActions = geoBlockedEvents.map(
                (e) => e.properties.attempted_action,
              );
              const hasDepositAction = attemptedActions.includes('deposit');

              if (!hasDepositAction) {
                throw new Error(
                  `Expected deposit in geo-blocked events. Found: ${attemptedActions.join(', ')}`,
                );
              }
            }
          }, 'Geo Blocked event should be tracked for deposit action');

          softAssert.throwIfErrors();
        },
      );
    });
  },
);
