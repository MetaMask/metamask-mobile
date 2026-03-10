import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokePredictions } from '../../tags';
import { loginToApp } from '../../flows/wallet.flow';
import Assertions from '../../framework/Assertions';
import WalletView from '../../page-objects/wallet/WalletView';
import {
  remoteFeatureFlagHomepageRedesignV1Enabled,
  remoteFeatureFlagPredictEnabled,
  confirmationFeatureFlags,
  remoteFeatureFlagHomepageSectionsV1Enabled,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS,
  POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage';
import {
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
} from '../../api-mocking/mock-responses/polymarket/polymarket-positions-response';
import { PredictHelpers } from './helpers/predict-helpers';
import { POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE } from '../../api-mocking/mock-responses/polymarket/polymarket-activity-response';
import Utilities from '../../framework/Utilities';
import { getEventsPayloads } from '../../helpers/analytics/helpers';
import SoftAssert from '../../framework/SoftAssert';
import PredictClaimPage from '../../page-objects/Predict/PredictClaimPage';

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
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
    ...remoteFeatureFlagHomepageRedesignV1Enabled(),
    ...remoteFeatureFlagPredictEnabled(true),
    ...Object.assign({}, ...confirmationFeatureFlags),
    carouselBanners: false,
  });
  await POLYMARKET_COMPLETE_MOCKS(mockServer);
  await POLYMARKET_TRANSACTION_SENTINEL_MOCKS(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true); // Include winnings for claim flow
};

const PredictionMarketFeatureForMarketDetails = async (mockServer: Mockttp) => {
  await PredictionMarketFeature(mockServer);
  await POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS(mockServer, true, {
    showWinningsAsActive: true,
  });
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
  it('claim winnings via predictions section', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPolygon()
          .withMetaMetricsOptIn()
          .build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeature,
      },
      async ({ mockServer }) => {
        await PredictHelpers.setPortugalLocation();
        await loginToApp();

        // Claim button is animated - disabling sync on iOS to prevent test hang
        await device.disableSynchronization();

        //await WalletView.scrollAndTapPredictionsSection();
        await WalletView.tapClaimButton();

        await postClaimMocks(mockServer);

        await Assertions.expectElementToBeVisible(PredictClaimPage.container);

        await PredictClaimPage.tapClaimConfirmButton();

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
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description:
            'Wallet screen should be visible after returning from activity',
        });
        await WalletView.scrollAndTapPredictionsSection('up');
        await Assertions.expectTextDisplayed('$48.16');

        // Verify analytics events
        const events = await getEventsPayloads(mockServer);
        const softAssert = new SoftAssert();

        const expectedEvents = {
          POSITION_VIEWED: 'Predict Position Viewed',
          ACTIVITY_VIEWED: 'Predict Activity Viewed',
        };

        // Event 1: PREDICT_POSITION_VIEWED
        await softAssert.checkAndCollect(async () => {
          const positionViewed = events.filter(
            (event) => event.event === expectedEvents.POSITION_VIEWED,
          );
          await Assertions.checkIfValueIsDefined(positionViewed);
          if (positionViewed.length > 0) {
            await Assertions.checkIfValueIsDefined(
              positionViewed[0].properties.open_positions_count,
            );
          }
        }, 'Position Viewed event should be tracked');

        // Event 2: PREDICT_ACTIVITY_VIEWED
        await softAssert.checkAndCollect(async () => {
          const activityViewed = events.filter(
            (event) => event.event === expectedEvents.ACTIVITY_VIEWED,
          );
          await Assertions.checkIfValueIsDefined(activityViewed);
          if (activityViewed.length > 0) {
            await Assertions.checkIfValueIsDefined(
              activityViewed[0].properties.activity_type,
            );
          }
        }, 'Activity Viewed event should be tracked');

        softAssert.throwIfErrors();
      },
    );
  });

  it('claim winnings via market details', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPolygon().build(),
        restartDevice: true,
        testSpecificMock: PredictionMarketFeatureForMarketDetails,
      },
      async ({ mockServer }) => {
        await PredictHelpers.setPortugalLocation();
        await loginToApp();

        // Claim button is animated - disabling sync on iOS to prevent test hang
        await device.disableSynchronization();

        await WalletView.scrollAndTapPredictionsPosition(positions.Open);

        await Assertions.expectElementToNotBeVisible(
          PredictDetailsPage.claimButton,
          {
            description:
              'Claim button should not be visible on a non-claimable position',
          },
        );
        await PredictDetailsPage.tapBackButton();

        // Switch mock so winning positions return redeemable: true.
        // By this point, React Query's 5s staleTime has elapsed, so the
        // positions query will refetch when market details re-enables it.
        await POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK(mockServer);

        await WalletView.scrollAndTapPredictionsPosition(positions.Won);

        await Assertions.expectElementToBeVisible(
          PredictDetailsPage.container,
          {
            description: 'Winning position details page should be visible',
          },
        );

        await PredictDetailsPage.tapClaimWinningsButton();
        await WalletView.tapClaimConfirmButton();

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

        await WalletView.scrollAndTapPredictionsSection('up');
        await Assertions.expectTextDisplayed('$48.16');
      },
    );
  });
});
