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
 * Account-list UI can block the tab bar after snap account creation on iOS CI.
 * Reload resets navigation while persisted state keeps the new account.
 */
const reloadAndVerifyStellarAccount = async (): Promise<void> => {
  await device.disableSynchronization();
  try {
    await device.reloadReactNative();
  } finally {
    await device.enableSynchronization();
  }

  await loginToApp();
  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet view should be visible after Stellar account setup',
    timeout: 15_000,
  });

  // postLoginAsyncOperations resyncs snap accounts asynchronously after reload.
  await WalletView.tapIdenticon();
  await Utilities.executeWithRetry(
    async () => {
      await Assertions.expectElementToBeVisible(
        Matchers.getElementByText(STELLAR_ACCOUNT_NAME),
        {
          description: 'Stellar snap account should persist after reload',
          timeout: 5000,
        },
      );
    },
    {
      timeout: 90_000,
      interval: 2_000,
      description: 'Wait for Stellar account after reload',
    },
  );
  await AccountListBottomSheet.tapBackButton();
  await TabBarComponent.tapHome();
};

export const withStellarAccountSnap = async (
  testFn: () => Promise<void>,
): Promise<void> => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().withStellarEnabled().build(),
      restartDevice: true,
      dapps: [
        {
          dappVariant: DappVariants.STELLAR_TEST_DAPP,
        },
      ],
    },
    async () => {
      await loginToApp();
      await createStellarSnapAccount();
      await reloadAndVerifyStellarAccount();
      await testFn();
    },
  );
};
