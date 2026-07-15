import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import {
  remoteFeatureFlagPredictEnabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_CASH_OUT_MOCKS,
  POLYMARKET_REMOVE_CASHED_OUT_POSITION_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import PredictCashOutPage from '../../page-objects/Predict/PredictCashOutPage.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails.js';
import { predictCashOutFlowAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-cash-out.analytics.js';
import { SPURS_PELICANS_POSITION_ID } from '../../api-mocking/mock-responses/polymarket/polymarket-constants.js';
import {
  loginForPredictTests,
  remoteFeatureFlagPerpsDisabledForPredictSmoke,
} from './helpers/predict-helpers.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow.js';

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
    ...remoteFeatureFlagPerpsDisabledForPredictSmoke(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    // TODO: Fix this test to support the FF-enabled Predict bottom sheet / any-token flow.
    predictBottomSheet: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    predictWithAnyToken: {
      enabled: false,
      minimumVersion: '0.0.0',
    },
    carouselBanners: false,
    predictExtendedSportsMarkets: {
      versions: {
        '7.82.0': {
          enabled: false,
          leagues: [],
          enabledSportsMarketTypes: [],
        },
      },
    },
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

appiumTest.describe(SmokePredictions('Predictions'), () => {
  appiumTest(
    'cashes out on open position: Spurs vs. Pelicans',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: PredictionMarketFeature,
          analyticsExpectations: predictCashOutFlowAnalyticsExpectations,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginForPredictTests();
          await WalletView.scrollAndTapPredictionsPosition(
            positionDetails.name,
            SPURS_PELICANS_POSITION_ID,
          );
          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.container,
            {
              timeout: resolveE2EWaitTimeoutMs(20_000),
              description: 'Predict market details screen should be visible',
            },
          );
          await POLYMARKET_POST_CASH_OUT_MOCKS(mockServer);

          await PredictDetailsPage.tapGameCashOutButton(
            SPURS_PELICANS_POSITION_ID,
          );
          await Assertions.expectElementToBeVisible(
            PredictCashOutPage.container,
          );

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

          // Top toast covers the market-details back control until it auto-dismisses.
          await ToastModal.waitForToastToDismiss();
          await PredictDetailsPage.tapBackButton();
          // Wait for wallet home before scrolling — Android scrollIntoView
          // fails with getElementRect(elementId=undefined) if wallet-scroll-view
          // is not yet in the hierarchy after market-details pop.
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
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
    },
  );
});
