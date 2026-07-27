import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import Assertions from '../../framework/Assertions.js';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import {
  remoteFeatureFlagPredictEnabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_GEO_BLOCKED_MOCKS,
  POLYMARKET_MARKET_FEEDS_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import PredictAddFunds from '../../page-objects/Predict/PredictAddFunds.js';
import PredictUnavailableView from '../../page-objects/Predict/PredictUnavailableView.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import { SPURS_PELICANS_POSITION_ID } from '../../api-mocking/mock-responses/polymarket/polymarket-constants.js';
import { geoBlockedCombinedExpectations } from '../../helpers/analytics/expectations/predict-geo-restriction.analytics.js';
import {
  loginForPredictTests,
  remoteFeatureFlagPerpsDisabledForPredictSmoke,
} from './helpers/predict-helpers.js';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';

const predictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPerpsDisabledForPredictSmoke(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
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
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  await POLYMARKET_GEO_BLOCKED_MOCKS(mockServer);
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

appiumTest.describe(SmokePredictions('Predictions - Geo Restriction'), () => {
  appiumTest(
    'displays unavailable modal for feed action, cashout, and add funds when geo blocked',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: predictionGeoBlockedFeature,
          analyticsExpectations: geoBlockedCombinedExpectations,
          currentDeviceDetails,
        },
        async () => {
          await loginForPredictTests();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await PredictMarketList.waitForScreenToDisplay({
            description:
              'Predict market list container is visible before feed action',
          });

          await PredictMarketList.tapCategoryTab('new');
          await PredictMarketList.tapYesBasedOnCategoryAndIndex('new', 1);
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
          await PredictMarketList.tapBackButton();
          await TabBarComponent.tapWallet();
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(15_000));

          await WalletView.scrollAndTapPredictionsPosition(
            'Spurs vs. Pelicans',
            SPURS_PELICANS_POSITION_ID,
          );
          await PredictDetailsPage.tapGameCashOutButton(
            SPURS_PELICANS_POSITION_ID,
          );
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();

          await PredictDetailsPage.tapBackButton();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.balanceCard,
            {
              description:
                'Predict balance card is visible before attempting add funds',
            },
          );
          await PredictAddFunds.tapAddFunds();
          await PredictUnavailableView.expectVisible();
          await PredictUnavailableView.tapGotIt();
          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.balanceCard,
            {
              description:
                'Predict balance card is visible after dismissing unavailable modal',
            },
          );
        },
      );
    },
  );
});
