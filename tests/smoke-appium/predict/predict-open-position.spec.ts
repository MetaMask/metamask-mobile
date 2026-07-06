import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage.js';
import Assertions from '../../framework/Assertions.js';
import {
  remoteFeatureFlagHomepageSectionsV1Enabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_POST_OPEN_POSITION_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { predictOpenPositionAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-open-position.analytics.js';
import {
  loginForPredictTests,
  remoteFeatureFlagPerpsDisabledForPredictSmoke,
} from './helpers/predict-helpers.js';
import { CELTICS_NETS_POSITION_ID } from '../../api-mocking/mock-responses/polymarket/polymarket-constants.js';

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
    predictHomeRedesign: {
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
  await POLYMARKET_LEGACY_SAFE_ACCOUNT_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings. Claim Button is animated and problematic for e2e
};

appiumTest.describe(SmokePredictions('Predictions'), () => {
  appiumTest(
    'opens position on Celtics vs. Nets market',
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
          analyticsExpectations: predictOpenPositionAnalyticsExpectations,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginForPredictTests();

          await WalletView.scrollAndTapPredictionsSection();

          await PredictMarketList.waitForScreenToDisplay({
            description: 'Predict market list container should be visible',
          });

          await PredictMarketList.tapCategoryTab(positionDetails.category);
          await PredictMarketList.tapMarketCard(
            positionDetails.category,
            positionDetails.marketIndex,
          );
          await PredictDetailsPage.tapGameBetYesButton();

          await POLYMARKET_POST_OPEN_POSITION_MOCKS(mockServer);

          await PredictDetailsPage.tapPositionAmount(
            positionDetails.positionAmount,
          );
          await PredictDetailsPage.tapDoneButton();

          await PredictDetailsPage.tapOpenPosition();

          await PredictDetailsPage.tapBackButton();
          await Assertions.expectTextDisplayed(positionDetails.newBalance, {
            description: `USDC balance should display ${positionDetails.newBalance} after opening position`,
          });
          await PredictMarketList.tapBackButton();

          await WalletView.scrollAndTapPredictionsPosition(
            positionDetails.name,
            CELTICS_NETS_POSITION_ID,
          );

          /*
          When opening a position, the balance is optimistically updated in PredictController
          with a cache valid for 5 seconds. When getBalance() is called after cache expiration
          it invalidates the NetworkController's block cache and
          makes a fresh RPC balance request. The mock is placed here to
          verify that when the cache expires and a balance refresh request
          is made, it successfully returns the updated balance.
         */
          await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(
            mockServer,
            'open-position',
          );

          await PredictDetailsPage.tapBackButton();
          await WalletView.scrollAndTapPredictionsSection();
          await Assertions.expectTextDisplayed(positionDetails.newBalance);
        },
      );
    },
  );
});
