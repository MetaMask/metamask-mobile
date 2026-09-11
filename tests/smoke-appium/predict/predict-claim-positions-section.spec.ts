import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import PredictClaimPage from '../../page-objects/Predict/PredictClaimPage.js';
import { predictClaimPositionsAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-claim-positions.analytics.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import PredictHome from '../../page-objects/Predict/PredictHome.js';
import PredictPositions from '../../page-objects/Predict/PredictPositions.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import {
  loginForPredictTests,
  PredictHelpers,
} from './helpers/predict-helpers.js';
import {
  postClaimMocks,
  predictionMarketFeature,
  verifyResolvedPositionsRemoved,
} from './helpers/predict-claim-positions.helpers.js';

appiumTest.describe(SmokePredictions('Claim winnings:'), () => {
  appiumTest(
    'claim winnings via Predict Positions',
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
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await PredictHelpers.setPortugalLocation();
          await loginForPredictTests();

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await PredictHome.waitForScreenToDisplay({
            description: 'Predict home should be visible',
          });
          await PredictHome.tapPositions();
          await PredictPositions.waitForScreenToDisplay();
          await PredictPositions.tapClaimButton();

          await postClaimMocks(mockServer);

          await Assertions.expectElementToBeVisible(
            PredictClaimPage.container,
            {
              description: 'Predict claim page should be visible',
            },
          );

          await PredictClaimPage.tapClaimConfirmButton();

          await verifyResolvedPositionsRemoved();

          // Confirm `goBack` returns to Positions, not wallet home. Claim toast
          // covers the header back control until it dismisses.
          await ToastModal.waitForToastToDismiss();
          await PredictPositions.tapBackButton();
          await PredictHome.waitForScreenToDisplay({
            description: 'Predict home should be visible after claim',
          });
          await PredictHome.expectAmountDisplayed('$48.16');
        },
      );
    },
  );
});
