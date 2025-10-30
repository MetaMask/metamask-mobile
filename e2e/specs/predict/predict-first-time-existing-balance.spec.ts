import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { PredictBalanceSelectorsIDs } from '../../selectors/Predict/Predict.selectors';
import enContent from '../../../locales/languages/en.json';

const EXPECTED_BALANCE_TEXT = '$28.16';

const PredictionFirstTimeExistingBalance = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(
  SmokePredictions('Predictions - First-time user with existing balance'),
  () => {
    it('loads Predict feed and displays balance for existing PM account', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          restartDevice: true,
          testSpecificMock: PredictionFirstTimeExistingBalance,
        },
        async () => {
          await loginToApp();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description: 'Predict balance card should be visible',
            },
          );
          await Assertions.expectTextDisplayed(
            enContent.predict.available_balance,
            {
              description: 'Available balance label should be displayed',
            },
          );
          await Assertions.expectTextDisplayed(EXPECTED_BALANCE_TEXT, {
            description: `Predict balance should display ${EXPECTED_BALANCE_TEXT}`,
          });
        },
      );
    });

    it('loads Wallet > Predictions tab and displays balance and positions', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          restartDevice: true,
          testSpecificMock: PredictionFirstTimeExistingBalance,
        },
        async () => {
          await loginToApp();
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet container should be visible',
          });
          await WalletView.tapOnPredictionsTab();
          await Assertions.expectElementToBeVisible(
            WalletView.PredictionsTabContainer,
            {
              description:
                'Predictions tab content should be visible on Wallet > Predictions',
            },
          );
          await WalletView.tapOnAvailableBalance();
          await Assertions.expectElementToBeVisible(
            Matchers.getElementByID(PredictBalanceSelectorsIDs.BALANCE_CARD),
            {
              description: 'Predict balance card should appear after tapping',
            },
          );
          await Assertions.expectTextDisplayed(EXPECTED_BALANCE_TEXT, {
            description: `Predict balance should display ${EXPECTED_BALANCE_TEXT} on Wallet > Predictions`,
          });
        },
      );
    });
  },
);
