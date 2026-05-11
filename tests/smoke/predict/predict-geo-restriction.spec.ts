import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';
import WalletView from '../../page-objects/wallet/WalletView';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagHomepageSectionsV1Enabled,
  remoteFeatureFlagPredictEnabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_GEO_BLOCKED_MOCKS,
  POLYMARKET_MARKET_FEEDS_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictAddFunds from '../../page-objects/Predict/PredictAddFunds';
import PredictUnavailableView from '../../page-objects/Predict/PredictUnavailableView';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList';
import type { AnalyticsExpectations } from '../../framework/types';
import { SPURS_PELICANS_POSITION_ID } from '../../api-mocking/mock-responses/polymarket/polymarket-constants';

const predictionGeoBlockedFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    carouselBanners: false,
  });
  await POLYMARKET_MARKET_FEEDS_MOCKS(mockServer);
  await POLYMARKET_GEO_BLOCKED_MOCKS(mockServer);
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

const geoBlockedCombinedExpectations: AnalyticsExpectations = {
  eventNames: ['Geo Blocked Triggered'],
  validate: async ({ events }) => {
    if (events.length < 3) {
      throw new Error(
        `Expected at least 3 Geo Blocked Triggered events, got ${events.length}`,
      );
    }

    const attemptedActions = new Set(
      events
        .map((event) => event.properties?.attempted_action)
        .filter((value): value is string => typeof value === 'string'),
    );

    for (const event of events) {
      if (!event.properties?.country) {
        throw new Error(
          'Geo Blocked Triggered analytics is missing required "country" property',
        );
      }
    }

    for (const expectedAction of ['predict_action', 'cashout', 'deposit']) {
      if (!attemptedActions.has(expectedAction)) {
        throw new Error(
          `Missing Geo Blocked Triggered analytics for attempted_action="${expectedAction}"`,
        );
      }
    }
  },
};

describe(SmokePredictions('Predictions - Geo Restriction'), () => {
  it('displays unavailable modal for feed action, cashout, and add funds when geo blocked', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: predictionGeoBlockedFeature,
        analyticsExpectations: geoBlockedCombinedExpectations,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description:
            'Predict market list container is visible before feed action',
        });
        await PredictMarketList.tapCategoryTab('new');
        await PredictMarketList.tapYesBasedOnCategoryAndIndex('new', 1);
        await PredictUnavailableView.expectVisible();
        await PredictUnavailableView.tapGotIt();

        await PredictMarketList.tapBackButton();
        await WalletView.scrollAndTapPredictionsPosition('Spurs vs. Pelicans');
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
  });
});
