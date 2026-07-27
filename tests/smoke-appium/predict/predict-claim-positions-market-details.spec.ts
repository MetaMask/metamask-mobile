import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import { POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import Utilities from '../../framework/Utilities.js';
import {
  loginForPredictTests,
  PredictHelpers,
} from './helpers/predict-helpers.js';
import { waitForWalletHomePlaywright } from '../../flows/wallet.flow.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import {
  SPURS_PELICANS_POSITION_ID,
  BLUE_JAYS_MARINERS_POSITION_ID,
} from '../../api-mocking/mock-responses/polymarket/polymarket-constants.js';
import {
  claimPositions,
  postClaimMocks,
  predictionMarketFeatureForMarketDetails,
  verifyResolvedPositionsRemoved,
} from './helpers/predict-claim-positions.helpers.js';

appiumTest.describe(SmokePredictions('Claim winnings:'), () => {
  appiumTest(
    'claim winnings via market details',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: predictionMarketFeatureForMarketDetails,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await PredictHelpers.setPortugalLocation();
          await loginForPredictTests();

          await WalletView.scrollAndTapPredictionsPosition(
            claimPositions.Open,
            SPURS_PELICANS_POSITION_ID,
          );

          await Assertions.expectElementToNotBeVisible(
            PredictDetailsPage.claimButton,
            {
              description:
                'Claim button should not be visible on a non-claimable position',
            },
          );
          await PredictDetailsPage.tapBackButton();

          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));

          await POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK(mockServer);

          await WalletView.scrollAndTapPredictionsPosition(
            claimPositions.Won,
            BLUE_JAYS_MARINERS_POSITION_ID,
          );

          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.container,
            {
              description: 'Winning position details page should be visible',
              timeout: resolveE2EWaitTimeoutMs(20_000),
            },
          );

          await PredictDetailsPage.tapClaimWinningsButton();
          await WalletView.tapClaimConfirmButton();

          await postClaimMocks(mockServer);

          await Utilities.executeWithRetry(
            async () => {
              await Assertions.expectElementToNotBeVisible(
                PredictDetailsPage.claimButton,
              );
            },
            {
              timeout: 10000,
              description:
                'Claim button on market details should not be visible',
            },
          );
          // Top claim toast covers the market-details back control until dismissed.
          await ToastModal.waitForToastToDismiss();
          await PredictDetailsPage.tapBackButton();

          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(20_000));

          await Assertions.expectElementToNotBeVisible(WalletView.claimButton, {
            description: 'Claim button should not be visible',
          });

          await verifyResolvedPositionsRemoved();

          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectTextDisplayed('$48.16');
        },
      );
    },
  );
});
