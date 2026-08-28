import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import PredictClaimPage from '../../page-objects/Predict/PredictClaimPage.js';
import { predictClaimPositionsAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-claim-positions.analytics.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import PredictMarketList from '../../page-objects/Predict/PredictMarketList.js';
import PredictBalance from '../../page-objects/Predict/PredictBalance.js';
import PredictPositions from '../../page-objects/Predict/PredictPositions.js';
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
          await PredictMarketList.waitForScreenToDisplay({
            description: 'Predict market list should be visible',
          });
          await PredictBalance.tapPositions();
          await PredictPositions.waitForScreenToDisplay();
          await PredictPositions.tapClaimButton();

          await postClaimMocks(mockServer);

          await Assertions.expectElementToBeVisible(PredictClaimPage.container);

          await PredictClaimPage.tapClaimConfirmButton();

          await verifyResolvedPositionsRemoved();

          // Claim confirm `goBack` can leave a Predict stack on top after RN v7.
          // Reach wallet home before Activity so details open on a clean stack.
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));

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
