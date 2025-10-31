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
import enContent from '../../../locales/languages/en.json';
import CustomAmountInfo from '../../pages/Confirmations/CustomAmountInfo';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';

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

        // Start withdraw flow
        await PredictDetailsPage.tapWithdrawButton();

        // Choose max and confirm
        // Wait for confirmation container to appear
        // const flatContainer = Matchers.getElementByID(
        //   'flat-confirmation-container',
        // ) as DetoxElement;
        // const modalContainer = Matchers.getElementByID(
        //   'modal-confirmation-container',
        // ) as DetoxElement;

        // const flatVisible = await Utilities.isElementVisible(
        //   flatContainer,
        //   3000,
        // );
        // if (!flatVisible) {
        //   await Assertions.expectElementToBeVisible(modalContainer, {
        //     description: 'Confirmation container visible',
        //   });
        // }

        // Enter a small amount and tap Done (Max button may not be shown depending on state)
        await CustomAmountInfo.typeAmountAndDone('1');

        await FooterActions.tapConfirmButton();

        // Post-confirmation withdraw mocks (balance refresh + sentinel)
        await POLYMARKET_POST_WITHDRAW_MOCKS(mockServer);

        // Verify withdrawal completion toast title appears
        await Assertions.expectTextDisplayed(
          enContent.predict.withdraw.withdraw_completed,
          { description: 'Withdrawal completed toast should appear' },
        );
      },
    );
  });
});
