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

const STELLAR_ACCOUNT_NAME = 'Stellar Account 1';

const dismissAccountListIfOpen = async (): Promise<void> => {
  if (
    await Utilities.isElementVisible(AccountListBottomSheet.accountList, 1000)
  ) {
    await AccountListBottomSheet.tapBackButton();
  }
};

const assertStellarAccountVisibleInList = async (): Promise<void> => {
  await Assertions.expectElementToBeVisible(
    Matchers.getElementByText(STELLAR_ACCOUNT_NAME),
    {
      description: 'Stellar account should exist in account list',
      timeout: 5000,
    },
  );
};

/**
 * postLoginAsyncOperations runs multichain discovery/alignment asynchronously.
 * Prefer this path — same end state as BTC/Solana on login.
 */
const waitForStellarAccountViaLoginDiscovery = async (): Promise<boolean> => {
  try {
    await Utilities.executeWithRetry(
      async () => {
        await WalletView.tapIdenticon();
        try {
          await assertStellarAccountVisibleInList();
        } finally {
          await dismissAccountListIfOpen();
        }
      },
      {
        timeout: 60_000,
        interval: 3_000,
        description: 'Wait for Stellar account via login discovery',
      },
    );
    return true;
  } catch {
    return false;
  }
};

/**
 * Fallback when login-time alignment has not finished before the test proceeds.
 * Uses the wallet multichain account list — not the connect-sheet import path.
 */
const createStellarSnapAccountManually = async (): Promise<void> => {
  await WalletView.tapIdenticon();

  if (
    await Utilities.isElementVisible(
      Matchers.getElementByText(STELLAR_ACCOUNT_NAME),
      2000,
    )
  ) {
    await dismissAccountListIfOpen();
    return;
  }

  await AccountListBottomSheet.tapAddAccountButtonV2({ shouldWait: true });

  await Utilities.executeWithRetry(
    async () => {
      const button = Matchers.getElementByID(
        AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
        0,
      );
      await Assertions.expectElementToHaveText(button, 'Add account', {
        timeout: 5000,
        description: 'Add account button ready after Stellar creation',
      });
    },
    {
      timeout: 90_000,
      interval: 2_000,
      description: 'Wait for Stellar snap account creation to finish',
    },
  );

  await assertStellarAccountVisibleInList();
};

/**
 * The account-list sheet can cover the tab bar after snap account creation.
 * Dismiss in-place — never reload (reload crashes Detox sync on Android).
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
        description: 'Wallet home should be visible',
      });
      await TabBarComponent.tapExploreButton();
      await TabBarComponent.tapHome();
    },
    {
      timeout: 30_000,
      interval: 1_500,
      description: 'Ensure tab bar is usable after Stellar account setup',
    },
  );
};

const ensureStellarSnapAccount = async (): Promise<void> => {
  const discoveredViaLogin = await waitForStellarAccountViaLoginDiscovery();

  if (discoveredViaLogin) {
    await TabBarComponent.tapHome();
    return;
  }

  await createStellarSnapAccountManually();
  await returnToWalletAfterStellarAccountSetup();
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
      await ensureStellarSnapAccount();
      await testFn();
    },
  );
};
