import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../framework/Assertions';
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

  it('Should be able to disconnect and connect again', async () => {
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

      await new Promise((resolve) => setTimeout(resolve, 3000));

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
});
