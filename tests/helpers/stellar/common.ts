import { AccountListBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../framework/Constants';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Utilities from '../../framework/Utilities';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';

/**
 * Stellar snap accounts are not auto-discovered on login (unlike Bitcoin/Solana).
 * Create one via the wallet account list before running dapp tests.
 */
const createStellarSnapAccount = async (): Promise<void> => {
  await WalletView.tapIdenticon();
  await AccountListBottomSheet.tapAddAccountButtonV2({ shouldWait: true });
  await Utilities.executeWithRetry(
    async () => {
      const button = Matchers.getElementByID(
        AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
        0,
      );
      await Assertions.expectElementToHaveText(button, 'Add account', {
        timeout: 5000,
      });
    },
    {
      timeout: 90_000,
      interval: 2_000,
      description: 'Wait for Stellar account creation to finish',
    },
  );
  await AccountListBottomSheet.waitForAccountSyncToComplete();
};

/**
 * The account-list sheet can cover the tab bar after snap account creation.
 * Dismiss it in-place — do NOT reload the app (reload crashes Detox sync on
 * Android and hangs iOS CI).
 */
const returnToWalletAfterStellarAccountSetup = async (): Promise<void> => {
  if (
    await Utilities.isElementVisible(AccountListBottomSheet.accountList, 2000)
  ) {
    await AccountListBottomSheet.tapBackButton();
  }

  if (
    await Utilities.isElementVisible(AccountListBottomSheet.accountList, 2000)
  ) {
    await AccountListBottomSheet.dismissAccountListModalV2();
  }

  if (
    await Utilities.isElementVisible(AccountListBottomSheet.accountList, 1000)
  ) {
    await WalletView.tapIdenticon();
  }

  await Utilities.executeWithRetry(
    async () => {
      await Assertions.expectElementToBeVisible(WalletView.container, {
        timeout: 5000,
      });
      await TabBarComponent.tapExploreButton();
      await TabBarComponent.tapHome();
    },
    {
      timeout: 45_000,
      interval: 1_500,
      description: 'Ensure tab bar is usable after Stellar account setup',
    },
  );
};

export const withStellarAccountSnap = async (
  testFn: () => Promise<void>,
): Promise<void> => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().withStellarEnabled().build(),
      restartDevice: true,
      skipReactNativeReload: true,
      dapps: [
        {
          dappVariant: DappVariants.STELLAR_TEST_DAPP,
        },
      ],
    },
    async () => {
      await loginToApp();
      await createStellarSnapAccount();
      await returnToWalletAfterStellarAccountSetup();
      await testFn();
    },
  );
};
