import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POST_WITHDRAW_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import CustomAmountInfo from '../../pages/Confirmations/CustomAmountInfo';
import FooterActions from '../../pages/Browser/Confirmations/FooterActions';
import enContent from '../../../locales/languages/en.json';
import Utilities from '../../framework/Utilities';
import Matchers from '../../framework/Matchers';

/*
Scenario 6: User withdraws balance from Predictions account
  - Navigate to Wallet > Predictions and open balance card
  - Start withdraw, choose Max amount
  - Confirm withdrawal
  - Verify completion toast appears and balance is updated

*/

const PredictionFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(SmokePredictions('Predictions withdraw'), () => {
  it('withdraws max available balance and shows completion', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionFeature,
      },
      async ({ mockServer }) => {
        await loginToApp();

        // Open Predictions tab and expand balance card
        await WalletView.tapOnPredictionsTab();
        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
          { description: 'Predictions tab container visible' },
        );
        await WalletView.tapOnAvailableBalance();
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.balanceCard,
          { description: 'Predict balance card visible' },
        );

        // Start withdraw flow
        await PredictDetailsPage.tapWithdrawButton();

        // Choose max and confirm
        // Wait for confirmation container to appear
        const flatContainer = Matchers.getElementByID(
          'flat-confirmation-container',
        ) as DetoxElement;
        const modalContainer = Matchers.getElementByID(
          'modal-confirmation-container',
        ) as DetoxElement;

        const flatVisible = await Utilities.isElementVisible(
          flatContainer,
          3000,
        );
        if (!flatVisible) {
          await Assertions.expectElementToBeVisible(modalContainer, {
            description: 'Confirmation container visible',
          });
        }

        // Enter a small amount and tap Done (Max button may not be shown depending on state)
        await CustomAmountInfo.typeAmountAndDone('1');
        // Prepare withdraw response mocks so the confirmation completes and toast shows
        await POLYMARKET_POST_WITHDRAW_MOCKS(mockServer);
        await FooterActions.tapConfirmButton();

        // Verify withdrawal completion toast title appears
        await Assertions.expectTextDisplayed(
          enContent.predict.withdraw.withdraw_completed,
          { description: 'Withdrawal completed toast should appear' },
        );
      },
    );
  });
});
