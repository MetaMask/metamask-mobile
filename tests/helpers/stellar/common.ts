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

const returnToWalletAfterStellarAccountSetup = async (): Promise<void> => {
  await AccountListBottomSheet.tapBackButton();
  await Assertions.expectElementToBeVisible(WalletView.container, {
    description: 'Wallet view should be visible after Stellar account setup',
    timeout: 15000,
  });

  const accountListStillOpen = await Utilities.isElementVisible(
    AccountListBottomSheet.accountList,
    1000,
  );
  if (accountListStillOpen) {
    await AccountListBottomSheet.dismissAccountListModalV2();
    await Assertions.expectElementToBeVisible(WalletView.container, {
      description:
        'Wallet view should be visible after dismissing account list',
      timeout: 15000,
    });
  }

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
      await returnToWalletAfterStellarAccountSetup();

      await testFn();
    },
  );
};
