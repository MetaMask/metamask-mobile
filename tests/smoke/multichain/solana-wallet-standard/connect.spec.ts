import { SmokeNetworkExpansion } from '../../../../e2e/tags';
import Assertions from '../../../framework/Assertions';
import SolanaTestDApp from '../../../../e2e/pages/Browser/SolanaTestDApp';
import {
  account1Short,
  account2Short,
  connectSolanaTestDapp,
  navigateToSolanaTestDApp,
} from '../../../flows/solana-connection.flow';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import AccountListBottomSheet from '../../../../e2e/pages/wallet/AccountListBottomSheet';
import { Utilities } from '../../../framework';
import { loginToApp, navigateToBrowserView } from '../../../../e2e/viewHelper';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Solana Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Should connect & disconnect from Solana test dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToSolanaTestDApp();

        await connectSolanaTestDapp();

        const header = SolanaTestDApp.getHeader();

        // Check we're connected
        const account = await header.getAccount();
        await Assertions.checkIfTextMatches(account, account1Short);
        const connectionStatus = await header.getConnectionStatus();
        await Assertions.checkIfTextMatches(connectionStatus, 'Connected');

        await header.disconnect();

        // Check we're disconnected
        const connectionStatusAfterDisconnect =
          await header.getConnectionStatus();
        await Assertions.checkIfTextMatches(
          connectionStatusAfterDisconnect,
          'Not connected',
        );
      },
    );
  });

  it('Should be able to cancel connection and connect again', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToSolanaTestDApp();

        const header = SolanaTestDApp.getHeader();
        await header.connect();
        await header.selectMetaMask();

        await SolanaTestDApp.tapCancelButton();

        const connectionStatus = await header.getConnectionStatus();
        await Assertions.checkIfTextMatches(connectionStatus, 'Not connected');

        await connectSolanaTestDapp();

        const account = await header.getAccount();
        await Assertions.checkIfTextMatches(account, account1Short);
      },
    );
  });

  // Skipping individual test for now, as it's flaky
  it.skip('Switching between 2 accounts should reflect in the dapp', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToSolanaTestDApp();
        await connectSolanaTestDapp({ selectAllAccounts: true });

        const header = SolanaTestDApp.getHeader();
        const account = await header.getAccount();
        await Assertions.checkIfTextMatches(account, account2Short);

        await TabBarComponent.tapWallet();
        await WalletView.tapCurrentMainWalletAccountActions();

        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(1);
        await navigateToBrowserView();

        const accountAfterSwitch = await header.getAccount();
        await Assertions.checkIfTextMatches(accountAfterSwitch, account1Short);
      },
    );
  });

  it('Should stay connected after page refresh', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.SOLANA_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToSolanaTestDApp();

        await connectSolanaTestDapp();

        // Should be connected
        const header = SolanaTestDApp.getHeader();
        const account = await header.getAccount();
        await Assertions.checkIfTextMatches(account, account1Short);

        // Refresh the page
        await SolanaTestDApp.reloadSolanaTestDApp();

        await Utilities.executeWithRetry(
          async () => {
            // Should still be connected after refresh
            const headerAfterRefresh = SolanaTestDApp.getHeader();
            const accountAfterRefresh = await headerAfterRefresh.getAccount();
            await Assertions.checkIfTextMatches(
              accountAfterRefresh,
              account1Short,
            );
          },
          {
            timeout: 10000,
            interval: 1500,
          },
        );
      },
    );
  });
});
