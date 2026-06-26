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
 * postLoginAsyncOperations runs multichain discovery/alignment asynchronously.
 * Poll until the Stellar snap account exists (same end state as BTC/Solana on login).
 */
const waitForStellarAccountAfterLogin = async (): Promise<void> => {
  await Utilities.executeWithRetry(
    async () => {
      await WalletView.tapIdenticon();
      try {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByText(STELLAR_ACCOUNT_NAME),
          {
            description: 'Stellar account should exist after login',
            timeout: 5000,
          },
        );
      } finally {
        if (
          await Utilities.isElementVisible(
            AccountListBottomSheet.accountList,
            1000,
          )
        ) {
          await AccountListBottomSheet.tapBackButton();
        }
      }
    },
    {
      timeout: 120_000,
      interval: 3_000,
      description: 'Wait for Stellar account after login',
    },
  );
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
      await waitForStellarAccountAfterLogin();
      await testFn();
    },
  );
};
