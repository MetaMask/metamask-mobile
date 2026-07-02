import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails.js';
import { POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE } from '../../api-mocking/mock-responses/polymarket/polymarket-activity-response.js';
import PredictClaimPage from '../../page-objects/Predict/PredictClaimPage.js';
import { predictClaimPositionsAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-claim-positions.analytics.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import {
  loginForPredictTests,
  PredictHelpers,
} from './helpers/predict-helpers.js';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import {
  postClaimMocks,
  predictionMarketFeature,
  verifyResolvedPositionsRemoved,
} from './helpers/predict-claim-positions.helpers.js';

appiumTest.describe(SmokePredictions('Claim winnings:'), () => {
  appiumTest(
    'claim winnings via predictions section',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: predictionMarketFeature,
          analyticsExpectations: predictClaimPositionsAnalyticsExpectations,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await PredictHelpers.setPortugalLocation();
          await loginForPredictTests();

          await WalletView.tapClaimButton();

          await postClaimMocks(mockServer);

          await Assertions.expectElementToBeVisible(PredictClaimPage.container);

          await PredictClaimPage.tapClaimConfirmButton();

          await verifyResolvedPositionsRemoved();

          await TabBarComponent.tapActivity();

          await ActivitiesView.tapOnPredictionsTab();

          for (const position of POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE) {
            await ActivitiesView.tapPredictPosition(position.title);
            await Assertions.expectElementToBeVisible(
              PredictActivityDetails.container,
              {
                description: `Activity details should be visible for "${position.title}"`,
              },
            );
            const expectedBalance = `$${position.usdcSize.toFixed(2)}`;
            await Assertions.expectTextDisplayed(expectedBalance, {
              description: `Balance should be displayed as "${expectedBalance}" for "${position.title}"`,
            });
            await PredictActivityDetails.tapBackButton();
          }

          await TabBarComponent.tapWallet();
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectTextDisplayed('$48.16');
        },
      );
    },
  );
});
