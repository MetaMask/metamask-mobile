import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet';
import WalletView from '../../page-objects/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { POLYMARKET_COMPLETE_MOCKS } from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import enContent from '../../../locales/languages/en.json';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';

const EXPECTED_BALANCE_TEXT = '$28.16';

const PredictionExistingPolyMarketBalance = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
};

describe(SmokePredictions('Existing Polymarket account'), () => {
  it('validate Predict feed loads and displays balance', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionExistingPolyMarketBalance,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();
        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.balanceCard,
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
        testSpecificMock: PredictionExistingPolyMarketBalance,
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
          PredictDetailsPage.balanceCard,
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
});
