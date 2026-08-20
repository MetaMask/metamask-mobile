import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeWalletPlatform } from '../../tags.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import {
  loginToAppPlaywright,
  waitForWalletHomePlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import Assertions from '../../framework/Assertions.js';
import { resolveE2EWaitTimeoutMs } from '../../framework/Constants.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import {
  LocalNode,
  LocalNodeType,
  type WithFixturesOptions,
} from '../../framework/types.js';
import { AnvilManager } from '../../seeder/anvil-manager.js';
import TransactionPayConfirmation from '../../page-objects/Confirmation/TransactionPayConfirmation.js';
import FooterActions from '../../page-objects/Browser/Confirmations/FooterActions.js';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent.js';
import ActivitiesView from '../../page-objects/Transactions/ActivitiesView.js';
import NetworkManager from '../../page-objects/wallet/NetworkManager.js';
import {
  setupMusdMocks,
  type MusdMockOptions,
} from '../../api-mocking/mock-responses/musd/musd-mocks.js';
import {
  createMusdFixture,
  type MusdFixtureOptions,
} from './helpers/musd-fixture.js';

/**
 * Returns the shared withFixtures config for mUSD conversion tests.
 * Only fixture options vary per scenario; localNodeOptions, restartDevice, and testSpecificMock are centralized here.
 */
function withMusdFixturesOptions(
  fixtureOptions: MusdFixtureOptions,
): WithFixturesOptions {
  const mockOptions: MusdMockOptions = {
    hasMusdBalance: fixtureOptions.hasMusdBalance,
    musdBalance: fixtureOptions.musdBalance,
  };

  return {
    fixture: ({ localNodes }: { localNodes?: LocalNode[] }) => {
      const node = localNodes?.[0] as unknown as AnvilManager;
      return createMusdFixture(node, fixtureOptions);
    },
    localNodeOptions: [
      {
        type: LocalNodeType.anvil,
        options: { chainId: 1 },
      },
    ],
    restartDevice: true,
    // Skip reload in cleanup to avoid native crash (SIGSEGV) when sync was disabled during test (same as snaps)
    skipReactNativeReload: true,
    testSpecificMock: (mockServer) => setupMusdMocks(mockServer, mockOptions),
  };
}

appiumTest.describe(SmokeWalletPlatform('mUSD Conversion Happy Path'), () => {
  appiumTest(
    'converts USDC to mUSD successfully (First Time User)',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          ...withMusdFixturesOptions({
            musdConversionEducationSeen: false,
          }),
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          // iOS Appium: wallet-screen often exists with displayed=false; use readiness helper
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));

          // Get mUSD primary CTA lives in TokensFullView (homepage Cash section removed)
          await NetworkManager.navigateToTokensFullView();

          // Verify primary Get mUSD CTA (above token list) and tap it
          await Assertions.expectElementToBeVisible(
            WalletView.musdAssetListConversionCta,
            {
              timeout: 30000,
              description:
                'mUSD asset-list conversion CTA should be visible in TokensFullView',
            },
          );
          await WalletView.tapGetMusdButton();

          // Verify education screen is shown (first time user) and tap Get Started
          await Assertions.expectElementToBeVisible(
            WalletView.getStartedButton,
            {
              timeout: 10000,
              description:
                'Education screen Get Started button should be visible',
            },
          );
          await WalletView.tapGetStartedButton();

          // Verify custom amount/confirmation screen is shown
          await Assertions.expectElementToBeVisible(
            TransactionPayConfirmation.payWithRow,
            {
              timeout: 10000,
              description:
                'Pay with row should be visible on confirmation screen',
            },
          );

          // Enter amount ($12) and continue (avoid "0" key to prevent banner blocking)
          await TransactionPayConfirmation.enterAmountAndContinue('12');

          // Confirm the transaction (tap the convert/confirm button)
          await FooterActions.tapConfirmButton();

          // Push opt-in sheet can appear after confirm and block wallet readiness
          await dismissPushNotificationExistingUserSheet();
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));

          // Go to Activity and verify mUSD conversion is confirmed (same pattern as send-native-token: no swipeDown)
          await TabBarComponent.tapActivity();
          await ActivitiesView.verifyMusdConversionConfirmed(0);
          // gets back to wallet to avoid waiting fora rpc updated in the activity view
          await TabBarComponent.tapWallet();
        },
      );
    },
  );

  appiumTest(
    'converts USDC to mUSD from Asset Overview',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          ...withMusdFixturesOptions({
            musdConversionEducationSeen: true,
          }),
          currentDeviceDetails,
        },
        async () => {
          await loginToAppPlaywright({ scenarioType: 'e2e' });
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));
          await NetworkManager.navigateToTokensFullView();

          // Tap on USDC to go to Asset Overview, scroll to mUSD CTA (ensures loaded), then tap
          // Appium token rows use getAssetTestId(symbol) → asset-USDC
          await WalletView.tapOnToken('USDC');
          await WalletView.scrollDownToAssetOverviewMusdCta();
          await WalletView.tapAssetOverviewMusdCta();

          // Verify confirmation screen (payToken/quote may load)
          await Assertions.expectElementToBeVisible(
            TransactionPayConfirmation.payWithRow,
            {
              timeout: 20000,
              description:
                'Pay with row should be visible on confirmation screen',
            },
          );

          // Enter amount and continue (avoid "0" key - use 5)
          await TransactionPayConfirmation.enterAmountAndContinue('5');

          // Confirm the transaction
          await FooterActions.tapConfirmButton();

          await dismissPushNotificationExistingUserSheet();
          await waitForWalletHomePlaywright(resolveE2EWaitTimeoutMs(30_000));

          // Go to Activity and verify mUSD conversion is confirmed
          await TabBarComponent.tapActivity();
          await ActivitiesView.verifyMusdConversionConfirmed(0);
          // gets back to wallet to avoid waiting fora rpc updated in the activity view
          await TabBarComponent.tapWallet();
        },
      );
    },
  );
});
