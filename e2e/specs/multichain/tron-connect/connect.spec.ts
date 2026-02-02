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

      // Verify we are connected
      const account = await TronTestDApp.getAccount();
      await Assertions.checkIfTextMatches(account, account1Short);
      const connectionStatus = await TronTestDApp.getConnectionStatus();
      await Assertions.checkIfTextMatches(connectionStatus, 'Connected');

      // 2. Disconnect
      await TronTestDApp.disconnect();

      // Verify we are disconnected
      const connectionStatusAfterDisconnect =
        await TronTestDApp.getConnectionStatus();
      await Assertions.checkIfTextMatches(
        connectionStatusAfterDisconnect,
        'Not connected',
      );

      // 3. Connect again
      await connectTronTestDapp();

      // Verify we are connected again
      const connectionStatusAfterConnect =
        await TronTestDApp.getConnectionStatus();
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

      // Verify we are connected
      const account = await TronTestDApp.getAccount();
      await Assertions.checkIfTextMatches(account, account1Short);
      await TronTestDApp.verifyConnectionStatus('Connected');

      // Refresh the page
      await TronTestDApp.reloadTronTestDApp();

      // Verify we are still connected
      await TronTestDApp.verifyConnectionStatus('Connected');
    });
  });
});
