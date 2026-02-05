import { SmokeWalletPlatform } from '../../../e2e/tags';
import TestHelpers from '../../../e2e/helpers';
import WalletView from '../../../e2e/pages/wallet/WalletView';
import { loginToApp } from '../../../e2e/viewHelper';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import {
  LocalNode,
  LocalNodeType,
  type WithFixturesOptions,
} from '../../framework/types';
import { AnvilManager } from '../../seeder/anvil-manager';
import TransactionPayConfirmation from '../../../e2e/pages/Confirmation/TransactionPayConfirmation';
import FooterActions from '../../../e2e/pages/Browser/Confirmations/FooterActions';
import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent';
import ActivitiesView from '../../../e2e/pages/Transactions/ActivitiesView';
import { setupMusdMocks } from '../../api-mocking/mock-responses/musd/musd-mocks';
import {
  createMusdFixture,
  type MusdFixtureOptions,
} from './helpers/musd-fixture';

/**
 * Returns the shared withFixtures config for mUSD conversion tests.
 * Only fixture options vary per scenario; localNodeOptions, restartDevice, and testSpecificMock are centralized here.
 */
function withMusdFixturesOptions(
  fixtureOptions: MusdFixtureOptions,
): WithFixturesOptions {
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
    testSpecificMock: setupMusdMocks,
    disableSynchronization: true,
  };
}

describe(SmokeWalletPlatform('mUSD Conversion Happy Path'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.launchApp();
  });

  it('converts USDC to mUSD successfully (First Time User)', async () => {
    await withFixtures(
      withMusdFixturesOptions({
        musdConversionEducationSeen: false,
      }),
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Verify mUSD CTA is visible and tap Get mUSD
        await Assertions.expectElementToBeVisible(
          WalletView.musdConversionCta,
          {
            description: 'mUSD conversion CTA should be visible',
          },
        );
        await WalletView.tapGetMusdButton();

        // Verify education screen is shown (first time user) and tap Get Started
        await Assertions.expectElementToBeVisible(WalletView.getStartedButton, {
          timeout: 10000,
          description: 'Education screen Get Started button should be visible',
        });
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

        // Verify confirmation details are visible
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.total,
          {
            timeout: 10000,
            description: 'Total amount should be visible',
          },
        );

        // Confirm the transaction (tap the convert/confirm button)
        await FooterActions.tapConfirmButton();

        // Verify we're back in the wallet after confirmation (ignore processing/completed banners - flaky)
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description: 'Wallet view should be visible after conversion',
        });

        // Go to Activity and verify mUSD conversion is confirmed (same pattern as send-native-token: no swipeDown)
        await TabBarComponent.tapActivity();
        await ActivitiesView.verifyMusdConversionConfirmed(0);
      },
    );
  });

  it('converts USDC to mUSD from Token List (Returning User)', async () => {
    await withFixtures(
      withMusdFixturesOptions({
        musdConversionEducationSeen: true,
        hasMusdBalance: true,
        musdBalance: 100,
      }),
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Scroll to top then to USDC row (UI shows symbol "USDC" on token row). tapTokenListItemConvertToMusdCta uses checkStability + delay so list is ready before tap.
        await WalletView.scrollToTopOfTokensList();
        await WalletView.scrollToToken('USDCoin');
        await Assertions.expectElementToBeVisible(
          WalletView.tokenListItemConvertToMusdCta,
          {
            timeout: 10000,
            description:
              'Token list item mUSD CTA (Get X% mUSD bonus) should be visible on USDC row',
          },
        );
        await WalletView.tapTokenListItemConvertToMusdCta();

        // Education skipped (musdConversionEducationSeen: true) - confirmation screen shown (payToken/quote may load)
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

        // Verify we're back in the wallet after confirmation
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description:
            'Wallet view should be visible after transaction confirmation',
        });

        // Go to Activity and verify mUSD conversion is confirmed
        await TabBarComponent.tapActivity();
        await ActivitiesView.verifyMusdConversionConfirmed(0);
      },
    );
  });

  it('converts USDC to mUSD from Asset Overview', async () => {
    await withFixtures(
      withMusdFixturesOptions({
        musdConversionEducationSeen: true,
      }),
      async () => {
        await loginToApp();

        // Verify wallet is visible
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible',
        });

        // Tap on USDC to go to Asset Overview, scroll to mUSD CTA (ensures loaded), then tap
        await WalletView.tapOnToken('USDCoin');
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

        // Verify confirmation details are visible
        await Assertions.expectElementToBeVisible(
          TransactionPayConfirmation.total,
          {
            timeout: 10000,
            description: 'Total amount should be visible',
          },
        );

        // Confirm the transaction
        await FooterActions.tapConfirmButton();

        // Verify we're back in the wallet after confirmation
        await Assertions.expectElementToBeVisible(WalletView.container, {
          timeout: 30000,
          description:
            'Wallet view should be visible after transaction confirmation',
        });

        // Go to Activity and verify mUSD conversion is confirmed
        await TabBarComponent.tapActivity();
        await ActivitiesView.verifyMusdConversionConfirmed(0);
      },
    );
  });
});
