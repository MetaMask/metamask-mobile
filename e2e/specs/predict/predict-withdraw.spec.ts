import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';

import {
  remoteFeatureFlagPredictEnabled,
  confirmationsRedesignedFeatureFlags,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_USDC_BALANCE_MOCKS,
  POLYMARKET_POST_WITHDRAW_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import Assertions from '../../framework/Assertions';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import { PredictWithdrawSelectorsIDs } from '../../selectors/Predict/Predict.selectors';
import PredictWithdraw from '../../pages/Predict/PredictWithdraw';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import ToastModal from '../../pages/wallet/ToastModal';

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  }); // we need to mock the confirmations redesign Feature flag
  await POLYMARKET_USDC_BALANCE_MOCKS(mockServer); // Sets up all RPC mocks needed for withdraw flow
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer); // needed to load the withdraw/deposit/claim screen
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, false); // do not include winnings for claim flow
};

/*
Test Scenario: User withdraws balance from Predictions account
  - Navigate to Wallet > Predictions and open balance card
  - Start withdraw, choose Max amount
  - Confirm withdrawal
  - Verify completion toast appears and balance is updated
*/

describe(SmokeTrade('Predictions'), () => {
  it('should withdraw positions', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await PredictDetailsPage.tapWithdrawButton();

        // Enter a small amount and tap Done
        await PredictWithdraw.typeAmountAndDone('2');
        await POLYMARKET_POST_WITHDRAW_MOCKS(mockServer);
        await FooterActions.tapConfirmButton();

        // Verify withdrawal completion toast title appears
        await Assertions.expectElementToBeVisible(
          ToastModal.notificationTitle,
          { description: 'Toast title visible' },
        );
        await Assertions.expectElementToHaveText(
          ToastModal.notificationTitle,
          PredictWithdrawSelectorsIDs.WITHDRAW_COMPLETED,
          { description: 'Toast title text matches' },
        );
      },
    );
  });

  it('taps percentage shortcuts on withdraw', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await PredictDetailsPage.tapWithdrawButton();

        // Focus input to reveal percentage buttons
        await PredictWithdraw.focusAmountInput();

        // Tap 10%, validate, then clear to 0
        await PredictWithdraw.tapTenPercent();
        await PredictWithdraw.expectAmountContains('2.81');
        await PredictWithdraw.clearAll();
        await PredictWithdraw.expectAmountVisible('0');

        // Tap 25%, validate, then clear to 0 (→ 7.04)
        await PredictWithdraw.tapTwentyFivePercent();
        await PredictWithdraw.expectAmountContains('7.04');
        await PredictWithdraw.clearAll();
        await PredictWithdraw.expectAmountVisible('0');

        // Tap 50%, validate, then clear to 0 (→ 14.08)
        await PredictWithdraw.tapFiftyPercent();
        await PredictWithdraw.expectAmountContains('14.08');
        await PredictWithdraw.clearAll();
        await PredictWithdraw.expectAmountVisible('0');

        // Tap Max, validate, then clear to 0 (→ 28.16)
        await PredictWithdraw.tapMaxButton();
        await PredictWithdraw.expectAmountContains('27.45');
        await PredictWithdraw.clearAll();
        await PredictWithdraw.expectAmountVisible('0');
      },
    );
  });
});
