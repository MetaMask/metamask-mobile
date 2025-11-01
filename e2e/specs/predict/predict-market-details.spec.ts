import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import Assertions from '../../framework/Assertions';
import { remoteFeatureFlagPredictEnabled } from '../../api-mocking/mock-responses/feature-flags-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { PredictMarketDetailsSelectorsIDs } from '../../selectors/Predict/Predict.selectors';
import { Matchers } from '../../framework';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import PredictMarketList from '../../pages/Predict/PredictMarketList';

/*
Test Scenario: Verify market details tabs
  Verifies that market details tabs display correct information:
  1. Navigate to Trade tab via actions menu
  2. Open the first market displayed in the feed
  3. Verify market details screen is visible
  4. Open About tab and verify data loads correctly
  5. Open Outcomes tab and verify data loads correctly
*/

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureFlagPredictEnabled(true),
  );
};

describe(SmokePredictions('Predictions'), () => {
  it('should display market details with About and Outcomes tabs', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async () => {
        await loginToApp();

        // Navigate to Trade tab via actions menu
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapPredictButton();

        // Wait for market list to load
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Predict market list should be visible',
        });

        // Tap on the first market in the feed (trending category, index 1)
        await PredictMarketList.tapMarketCard('trending', 1);

        // Verify market details screen is visible
        await Assertions.expectElementToBeVisible(PredictDetailsPage.container);

        // Open About tab and verify content
        await PredictDetailsPage.tapAboutTab();
        const aboutTabContent = Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.ABOUT_TAB,
        );
        await Assertions.expectElementToBeVisible(aboutTabContent, {
          description: 'About tab content should be visible',
        });

        // Verify About tab displays market information by checking for common text
        await Assertions.expectTextDisplayed('Volume', {
          description: 'About tab should show volume information',
        });

        // Open Outcomes tab and verify content
        await PredictDetailsPage.tapOutcomesTab();
        const outcomesTabContent = Matchers.getElementByID(
          PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB,
        );
        await Assertions.expectElementToBeVisible(outcomesTabContent, {
          description: 'Outcomes tab content should be visible',
        });

        // Verify Outcomes tab displays outcome options
        await Assertions.expectTextDisplayed('Yes', {
          description: 'Outcomes tab should show Yes option',
        });
        await Assertions.expectTextDisplayed('No', {
          description: 'Outcomes tab should show No option',
        });

        // Return to previous screen (market list)
        await PredictDetailsPage.tapBackButton();
        await Assertions.expectElementToBeVisible(PredictMarketList.container, {
          description: 'Should return to market list',
        });
      },
    );
  });
});
