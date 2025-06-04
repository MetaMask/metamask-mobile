'use strict';
import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../utils/Assertions';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import { connectSolanaTestDapp, navigateToSolanaTestDApp } from './testHelpers';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import TestHelpers from '../../../helpers';
import { withSolanaAccountSnap } from '../../../common-solana';

describe(SmokeNetworkExpansion('Solana Wallet Standard E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  describe('Connect to Solana test dapp', () => {
    describe('Connect & disconnect from Solana test dapp', () => {
      it('Should connect & disconnect', async () => {
        await withSolanaAccountSnap({},
          async () => {
            await navigateToSolanaTestDApp();

            await connectSolanaTestDapp();

            const header = SolanaTestDApp.getHeader();

            // Check we're connected
            const account = await header.getAccount();
            await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');
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
    });

    it('Should be able to cancel connection and connect again', async () => {
      await withSolanaAccountSnap({},
        async () => {
          await navigateToSolanaTestDApp();

          const header = SolanaTestDApp.getHeader();
          await header.connect();
          await header.selectMetaMask();

          // Click connect button
          await ConnectBottomSheet.tapCancelButton();

          await TestHelpers.delay(1000);
          const connectionStatus = await header.getConnectionStatus();
          await Assertions.checkIfTextMatches(
            connectionStatus,
            'Not connected',
          );

          await connectSolanaTestDapp();

          const account = await header.getAccount();
          await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');
        },
      );
    });
  });

  describe('Page refresh', () => {
    it('Should not disconnect the dapp', async () => {
      await withSolanaAccountSnap({},
        async () => {
          await navigateToSolanaTestDApp();

          await connectSolanaTestDapp();

          // Should be connected
          const header = SolanaTestDApp.getHeader();
          const account = await header.getAccount();
          await Assertions.checkIfTextMatches(account, 'CEQ8...Yrrd');

          // Refresh the page
          await SolanaTestDApp.reloadSolanaTestDApp();
          await TestHelpers.delay(4000);

          // Should still be connected after refresh
          const headerAfterRefresh = SolanaTestDApp.getHeader();
          const accountAfterRefresh = await headerAfterRefresh.getAccount();
          await Assertions.checkIfTextMatches(accountAfterRefresh, 'CEQ8...Yrrd');
        },
      );
    });
  });
});
