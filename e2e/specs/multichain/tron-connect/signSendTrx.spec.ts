import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../framework/Assertions';
import TronTestDApp from '../../../pages/Browser/TronTestDApp';
import {
  account1Short,
  connectTronTestDapp,
  navigateToTronTestDApp,
} from './testHelpers';
import { withTronAccountEnabled } from '../../../common-tron';

describe(SmokeNetworkExpansion('Tron Connect E2E - Sign/Send TRX'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  // Due to not being able to mock API calls from the snap we cannot sign transactions
  // because transaction simulation call fails because the account has no balance
  it.skip('Should be able to sign a TRX transaction', async () => {
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

      // 2. Sign transaction
      await TronTestDApp.getSendTrxTest().signTransaction();

      // Approve the signature
      await TronTestDApp.confirmTransaction();

      const signedTransaction =
        await TronTestDApp.getSendTrxTest().getSignedTransaction();
      console.log(signedTransaction);
    });
  });
});
