import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../../tests/framework/Assertions';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import {
  account1Short,
  account2Short,
  connectSolanaTestDapp,
  navigateToSolanaTestDApp,
} from './testHelpers';
import { withSolanaAccountEnabled } from '../../../common-solana';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import { Utilities } from '../../../../tests/framework';
import { navigateToBrowserView } from '../../../viewHelper';

describe(SmokeNetworkExpansion('Solana Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Should connect & disconnect from Solana test dapp', async () => {
    await withSolanaAccountEnabled({}, async () => {
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
    });
  });

  it('Should be able to cancel connection and connect again', async () => {
    await withSolanaAccountEnabled({}, async () => {
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
    });
  });

  // Skipping individual test for now, as it's flaky
  it.skip('Switching between 2 accounts should reflect in the dapp', async () => {
    await withSolanaAccountEnabled(
      {
        //numberOfAccounts: 2, // This was removed as parameter since current functionality does not support Solana account creation, instead, a new wallet would need to be created.
      },
      async () => {
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
    await withSolanaAccountEnabled({}, async () => {
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
    });
  });
});
