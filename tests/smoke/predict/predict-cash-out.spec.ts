import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  remoteFeatureFlagHomepageSectionsV1Enabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_CASH_OUT_MOCKS,
  POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictCashOutPage from '../../page-objects/Predict/PredictCashOutPage';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails';
import { predictCashOutFlowAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-cash-out.analytics';

/*
Test Scenario: Cash out on open position - Spurs vs. Pelicans
  Verifies the cash out flow for a predictions position (homepage sections v1 — no wallet tabs):
  1. From wallet homepage Predictions section, open Spurs vs. Pelicans position details
  2. Cash out the position with updated mocks
  3. Verify balance and cash out in Activities tab
  */
const positionDetails = {
  name: 'Spurs vs. Pelicans',
  cashOutValue: '$30.75',
  initialBalance: '$28.16',
  newBalance: '$58.66',
};

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    ...remoteFeatureFlagPredictEnabled(true),
    carouselBanners: false,
    exploreSectionsOrder: {
      home: ['predictions', 'tokens', 'perps', 'stocks', 'sites'],
      quickActions: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
      search: ['tokens', 'perps', 'stocks', 'predictions', 'sites'],
    },
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

describe(SmokePredictions('Predictions'), () => {
  it('cashes out on open position: Spurs vs. Pelicans', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
        analyticsExpectations: predictCashOutFlowAnalyticsExpectations,
      },
      async ({ mockServer }) => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.scrollAndTapPredictionsPosition(positionDetails.name);
        await Assertions.expectElementToBeVisible(PredictDetailsPage.container);
        await POLYMARKET_POST_CASH_OUT_MOCKS(mockServer);

        await PredictDetailsPage.tapCashOutButton();
        await Assertions.expectElementToBeVisible(PredictCashOutPage.container);

        await Assertions.expectElementToBeVisible(
          PredictCashOutPage.cashOutButton,
        );

        await PredictCashOutPage.tapCashOutButton();

        // Register position-removal and balance-update mocks only AFTER the
        // cash-out confirmation tap. Registering them earlier causes a race
        // condition: a background refetch can pick up the "position removed"
        // response while the Cash Out button is still needed, making it vanish.
        await POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS(mockServer);
        await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'cash-out');

        await PredictDetailsPage.tapBackButton();
        await device.enableSynchronization();
        await WalletView.scrollAndTapPredictionsSection();
        await WalletView.tapOnAvailableBalance();
        await Assertions.expectTextDisplayed(positionDetails.newBalance, {
          description: 'Predictions balance should be updated to $58.66',
        });

        await PredictMarketList.tapBackButton();
        await TabBarComponent.tapActivity();

        await ActivitiesView.tapOnPredictionsTab();
        await Assertions.expectTextDisplayed('Cashed out');
        await ActivitiesView.tapPredictPosition(positionDetails.name);
        await Assertions.expectElementToBeVisible(
          PredictActivityDetails.container,
        );
        await Assertions.expectTextDisplayed(positionDetails.cashOutValue);
      },
    );
  });
});
