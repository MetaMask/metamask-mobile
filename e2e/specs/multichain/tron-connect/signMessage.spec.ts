import { SmokeNetworkExpansion } from '../../../tags';
import Assertions from '../../../../tests/framework/Assertions';
import TronTestDApp from '../../../pages/Browser/TronTestDApp';
import {
  account1Short,
  connectTronTestDapp,
  navigateToTronTestDApp,
  EXPECTED_SIGNED_MESSAGE,
} from './testHelpers';
import { withTronAccountEnabled } from '../../../common-tron';

describe(SmokeNetworkExpansion('Tron Connect E2E - Sign message'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Should be able to sign a message', async () => {
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

      // 2. Sign a message
      await TronTestDApp.getSignMessageTest().signMessage();

      // Approve the signature
      await TronTestDApp.confirmSignMessage();

      // Verify we are signed
      const signedMessage =
        await TronTestDApp.getSignMessageTest().getSignedMessage();
      await Assertions.checkIfTextMatches(
        signedMessage,
        EXPECTED_SIGNED_MESSAGE,
      );
    });
  });
});
