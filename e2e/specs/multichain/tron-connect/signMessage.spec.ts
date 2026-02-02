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

  it('Signs a message', async () => {
    await withTronAccountEnabled({}, async () => {
      await navigateToTronTestDApp();

      // 1. Connect
      await connectTronTestDapp();

      // Verify we are connected
      await TronTestDApp.verifyConnectedAccount(account1Short);
      await TronTestDApp.verifyConnectionStatus('Connected');

      // 2. Sign a message
      await TronTestDApp.signMessage();

      // Approve the signature
      await TronTestDApp.confirmSignMessage();

      // Verify we are signed
      const signedMessage = await TronTestDApp.getSignedMessage();
      await Assertions.checkIfTextMatches(
        signedMessage,
        EXPECTED_SIGNED_MESSAGE,
      );
    });
  });
});
