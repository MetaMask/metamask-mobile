import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../../tests/framework/Assertions';
import TronTestDApp from '../../../pages/Browser/TronTestDApp';
import {
  account1Short,
  connectTronTestDapp,
  navigateToTronTestDApp,
} from './testHelpers';
import { withTronAccountEnabled } from '../../../common-tron';

describe(SmokeNetworkExpansion('Tron Connect E2E - Connect'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Connects, disconnects and connects again', async () => {
    await withTronAccountEnabled({}, async () => {
      await navigateToTronTestDApp();

      // 1. Connect
      await connectTronTestDapp();

      const header = TronTestDApp.getHeader();

      // Verify we are connected
      const account = await header.getAccount();
      await Assertions.checkIfTextMatches(account, account1Short);
      const connectionStatus = await header.getConnectionStatus();
      await Assertions.checkIfTextMatches(connectionStatus, 'Connected');

      // 2. Disconnect
      await header.disconnect();

      // Verify we are disconnected
      const connectionStatusAfterDisconnect =
        await header.getConnectionStatus();
      await Assertions.checkIfTextMatches(
        connectionStatusAfterDisconnect,
        'Not connected',
      );

      // 3. Connect again
      await connectTronTestDapp();

      // Verify we are connected again
      const connectionStatusAfterConnect = await header.getConnectionStatus();
      await Assertions.checkIfTextMatches(
        connectionStatusAfterConnect,
        'Connected',
      );
    });
  });

  it('Restores the session after refreshing the page', async () => {
    await withTronAccountEnabled({}, async () => {
      await navigateToTronTestDApp();

      // 1. Connect
      await connectTronTestDapp();

      const header = TronTestDApp.getHeader();

      // Verify we are connected
      const account = await header.getAccount();
      await Assertions.checkIfTextMatches(account, account1Short);
      const connectionStatus = await header.getConnectionStatus();
      await Assertions.checkIfTextMatches(connectionStatus, 'Connected');

      // Refresh the page
      await TronTestDApp.reloadTronTestDApp();

      // Verify we are still connected
      const connectionStatusAfterRefresh = await header.getConnectionStatus();
      await Assertions.checkIfTextMatches(
        connectionStatusAfterRefresh,
        'Connected',
      );

      // Verify we are still connected
      const accountAfterRefresh = await header.getAccount();
      await Assertions.checkIfTextMatches(accountAfterRefresh, account1Short);
    });
  });
});
