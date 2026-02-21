import { SmokeNetworkExpansion } from '../../../tags';
import TronTestDApp from '../../../page-objects/Browser/TronTestDApp';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import {
  connectTronTestDapp,
  navigateToTronTestDApp,
  EXPECTED_SIGNED_MESSAGE,
} from './testHelpers';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeNetworkExpansion('Tron Connect E2E - Sign message'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
  });

  it('Signs a message', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        dapps: [
          {
            dappVariant: DappVariants.TRON_TEST_DAPP,
          },
        ],
      },
      async () => {
        await loginToApp();
        await navigateToTronTestDApp();

        // 1. Connect
        await connectTronTestDapp();

        // 2. Sign a message
        await TronTestDApp.signMessage();

        // Approve the signature
        await TronTestDApp.confirmSignMessage();

        // Verify signature
        await TronTestDApp.verifySignedMessage(EXPECTED_SIGNED_MESSAGE);
      },
    );
  });
});
