import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import {
  remoteFeatureFlagPredictEnabled,
  confirmationsRedesignedFeatureFlags,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import PredictClaimPage from '../../pages/Predict/PredictClaimPage';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import ActivitiesView from '../../pages/Transactions/ActivitiesView';
import PredictActivityDetails from '../../pages/Transactions/predictionsActivityDetails';
import PredictDetailsPage from '../../pages/Predict/PredictDetailsPage';
import {
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
} from '../../api-mocking/mock-responses/polymarket/polymarket-positions-response';
import { PredictHelpers } from './helpers/predict-helpers';
import { POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE } from '../../api-mocking/mock-responses/polymarket/polymarket-activity-response';
import Utilities from '../../framework/Utilities';

/*
Test Scenario: Claim winning positions

  Test 1: Verifies the claim flow for a predictions position:
  1. Navigate to Predictions tab and verify balance is $28.16
  2. Verify Claim Button is visible with $20.00 claimable amount
  3. Tap Claim Button
  4. Complete claim transaction
  5. Verify balance updated to $48.16 and all resolved positions (loss positions + winning positions) are removed from the UI

  Test 2: Verifies the claim flow for a predictions position:
  1. Navigate to Predictions tab
  2. Tap on lost position and verify Claim button is not visible
  3. Tap on winning position and verify Claim Button is visible with $20.00 claimable amount
  3. Tap Claim Button
  4. Complete claim transaction
  */

const PredictionMarketFeature = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(mockServer, {
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationsRedesignedFeatureFlags),
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true); // Include winnings for claim flow
};

/**
 * Mocks to updates balance, removes claimed positions, and adds them to activity
 */
const postClaimMocks = async (mockServer: Mockttp) => {
  await POLYMARKET_UPDATE_USDC_BALANCE_MOCKS(mockServer, 'claim');
  await POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS(mockServer);
  await POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS(mockServer);
};

/**
 * Verify that all resolved positions (lost positions + winning positions) are removed after claiming
 * Resolved positions include both:
 * 1. Lost positions (from POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE)
 * 2. Winning positions (from POLYMARKET_WINNING_POSITIONS_RESPONSE)
 */
const verifyResolvedPositionsRemoved = async () => {
  const allResolvedPositions = [
    ...POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
    ...POLYMARKET_WINNING_POSITIONS_RESPONSE,
  ];

  for (const position of allResolvedPositions) {
    await Assertions.expectTextNotDisplayed(position.title, {
      description: `Resolved position "${position.title}" should not be visible after claiming`,
    });
  }
};

const positions = {
  Open: 'Spurs vs. Pelicans',
  Lost: 'Commanders vs. Cowboys',
  Won: 'Blue Jays vs. Mariners',
};

describe(SmokePredictions('Claim winnings:'), () => {
  it('claim winnings via predictions tab', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await PredictHelpers.setPortugalLocation();
        await loginToApp();

        // Claim button is animated - disabling sync on iOS to prevent test hang
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
        );

        await WalletView.tapClaimButton();
        await Assertions.expectElementToBeVisible(PredictClaimPage.container);

        await PredictClaimPage.tapClaimConfirmButton();

        await postClaimMocks(mockServer);

        await Assertions.expectElementToBeVisible(WalletView.container);
        await device.enableSynchronization();

        await Assertions.expectElementToNotBeVisible(WalletView.claimButton, {
          description: 'Claim button should not be visible',
        });
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
          // Verify the balance is displayed correctly (formatted as $XX.XX)
          const expectedBalance = `$${position.usdcSize.toFixed(2)}`;
          await Assertions.expectTextDisplayed(expectedBalance, {
            description: `Balance should be displayed as "${expectedBalance}" for "${position.title}"`,
          });
          await PredictActivityDetails.tapBackButton();
        }

        await TabBarComponent.tapWallet();

        await Assertions.expectTextDisplayed('$48.16');
      },
    );
  });

  // Disabling this test as it is currently blocking CI
  it('claim winnings via market details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await PredictHelpers.setPortugalLocation();
        await loginToApp();

        // Claim button is animated - disabling sync on iOS to prevent test hang
        await device.disableSynchronization();

        await WalletView.tapOnPredictionsTab();

        await Assertions.expectElementToBeVisible(
          WalletView.PredictionsTabContainer,
          {
            description: 'Predictions tab container should be visible',
          },
        );

        await WalletView.scrollToPosition(positions.Won);

        await WalletView.tapPredictPosition(positions.Lost);

        await Assertions.expectElementToNotBeVisible(
          PredictDetailsPage.claimButton,
          {
            description:
              'Claim button should not be visible on a lost position',
          },
        );
        await PredictDetailsPage.tapBackButton();

        await WalletView.tapPredictPosition(positions.Won);

        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Winning position details page should be visible',
          },
        );

        await PredictDetailsPage.tapClaimWinningsButton();

        await PredictClaimPage.tapClaimConfirmButton();

        await postClaimMocks(mockServer);
        await device.enableSynchronization();

        await Utilities.executeWithRetry(
          async () => {
            await Assertions.expectElementToNotBeVisible(
              PredictDetailsPage.claimButton,
            );
          },
          {
            timeout: 10000,
            description:
              'Claim button on market destails should not be visible',
          },
        );
        await PredictDetailsPage.tapBackButton();

        await Assertions.expectElementToBeVisible(WalletView.container);

        await Assertions.expectElementToNotBeVisible(WalletView.claimButton, {
          description: 'Claim button should not be visible',
        });

        await verifyResolvedPositionsRemoved();

        await WalletView.scrollToPosition(positions.Open, 'up');

        await Assertions.expectTextDisplayed('$48.16');
      },
    );
  });
});
