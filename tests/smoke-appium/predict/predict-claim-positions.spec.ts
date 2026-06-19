import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokePredictions } from '../../tags.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import Assertions from '../../framework/Assertions.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import {
  remoteFeatureFlagPredictEnabled,
  remoteFeatureFlagHomepageSectionsV1Enabled,
  confirmationFeatureFlags,
} from '../../api-mocking/mock-responses/feature-flags-mocks.js';
import {
  POLYMARKET_COMPLETE_MOCKS,
  POLYMARKET_POSITIONS_WITH_WINNINGS_MOCKS,
  POLYMARKET_REMOVE_CLAIMED_POSITIONS_MOCKS,
  POLYMARKET_TRANSACTION_SENTINEL_MOCKS,
  POLYMARKET_UPDATE_USDC_BALANCE_MOCKS,
  POLYMARKET_ADD_CLAIMED_POSITIONS_TO_ACTIVITY_MOCKS,
  POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK,
} from '../../api-mocking/mock-responses/polymarket/polymarket-mocks.js';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import PredictActivityDetails from '../../page-objects/Transactions/predictionsActivityDetails.js';
import PredictDetailsPage from '../../page-objects/Predict/PredictDetailsPage.js';
import {
  POLYMARKET_RESOLVED_LOST_POSITIONS_RESPONSE,
  POLYMARKET_WINNING_POSITIONS_RESPONSE,
} from '../../api-mocking/mock-responses/polymarket/polymarket-positions-response.js';
import { POLYMARKET_CLAIMED_POSITIONS_ACTIVITY_RESPONSE } from '../../api-mocking/mock-responses/polymarket/polymarket-activity-response.js';
import Utilities from '../../framework/Utilities.js';
import PredictClaimPage from '../../page-objects/Predict/PredictClaimPage.js';
import { predictClaimPositionsAnalyticsExpectations } from '../../helpers/analytics/expectations/predict-claim-positions.analytics.js';
import WalletActionsBottomSheet from '../../page-objects/wallet/WalletActionsBottomSheet.js';
import {
  PredictHelpers,
  loginForPredictTests,
} from './helpers/predict-helpers.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import {
  SPURS_PELICANS_POSITION_ID,
  BLUE_JAYS_MARINERS_POSITION_ID,
} from '../../api-mocking/mock-responses/polymarket/polymarket-constants.js';

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
    ...remoteFeatureFlagHomepageSectionsV1Enabled(),
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

appiumTest.describe(SmokePredictions('Claim winnings:'), () => {
  appiumTest(
    'claim winnings via predictions section',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withPolygon()
            .withMetaMetricsOptIn()
            .build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: PredictionMarketFeature,
          analyticsExpectations: predictClaimPositionsAnalyticsExpectations,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginForPredictTests();

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
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapPredictButton();
          await Assertions.expectTextDisplayed('$48.16');
        },
      );
    },
  );

  appiumTest(
    'claim winnings via market details',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withPolygon().build(),
          restartDevice: true,
          disableLocalNodes: true,
          testSpecificMock: PredictionMarketFeatureForMarketDetails,
          currentDeviceDetails,
        },
        async ({ mockServer }) => {
          await loginForPredictTests();

          await WalletView.scrollAndTapPredictionsPosition(
            positions.Open,
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

          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet after leaving open position market details',
            timeout: resolveE2EWaitTimeoutMs(30_000),
          });

          // Switch mock so winning positions return redeemable: true.
          // By this point, React Query's 5s staleTime has elapsed, so the
          // positions query will refetch when market details re-enables it.
          await POLYMARKET_ENABLE_CLAIMABLE_POSITIONS_MOCK(mockServer);

          await Utilities.executeWithRetry(
            async () => {
              await Assertions.expectTextDisplayed(positions.Won, {
                description:
                  'Winning position listed on wallet before opening details',
              });
            },
            {
              timeout: resolveE2EWaitTimeoutMs(30_000),
              description: 'Winning position visible on wallet homepage',
            },
          );

          await WalletView.scrollAndTapPredictionsPosition(
            positions.Won,
            BLUE_JAYS_MARINERS_POSITION_ID,
          );

          await Assertions.expectElementToBeVisible(
            PredictDetailsPage.container,
            {
              description: 'Winning position details page should be visible',
              timeout: resolveE2EWaitTimeoutMs(30_000),
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
    },
  );
});
