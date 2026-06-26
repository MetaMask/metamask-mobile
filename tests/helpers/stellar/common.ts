import { AccountListBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../framework/Constants';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import Utilities, { sleep } from '../../framework/Utilities';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';

const STELLAR_ACCOUNT_NAME = 'Stellar Account 1';

const waitForAddAccountButtonReady = async (): Promise<void> => {
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
};

/**
 * Stellar snap accounts are not auto-discovered on login (unlike Bitcoin/Solana).
 * Create one via the wallet account list before running dapp tests.
 */
const ensureStellarSnapAccount = async (): Promise<void> => {
  await WalletView.tapIdenticon();

  const hasStellarAccount = await Utilities.isElementVisible(
    Matchers.getElementByText(STELLAR_ACCOUNT_NAME),
    3000,
  );
  if (hasStellarAccount) {
    await AccountListBottomSheet.tapBackButton();
    await TabBarComponent.tapHome();
    return;
  }

  await AccountListBottomSheet.tapAddAccountButtonV2({ shouldWait: true });
  await waitForAddAccountButtonReady();

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

  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet view should be visible after Stellar account setup',
    timeout: 15_000,
  });
  await TabBarComponent.tapHome();
};

export const withStellarAccountSnap = async (
  testFn: () => Promise<void>,
): Promise<void> => {
  await withFixtures(
    {
      fixture: new FixtureBuilder().withStellarEnabled().build(),
      restartDevice: true,
      skipReactNativeReload: true,
      disableSynchronization: true,
      dapps: [
        {
          dappVariant: DappVariants.STELLAR_TEST_DAPP,
        },
      ],
    },
    async () => {
      try {
        await loginToApp();
        // postLoginAsyncOperations runs multichain discovery/alignment async.
        await sleep(3000);
        await ensureStellarSnapAccount();
        await testFn();
      } finally {
        await device.enableSynchronization();
      }
    },
  );
};
