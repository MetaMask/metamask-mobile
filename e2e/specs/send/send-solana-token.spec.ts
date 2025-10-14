import SendView from '../../pages/Send/RedesignedSendView';
import SolanaTestDApp from '../../pages/Browser/SolanaTestDApp';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';

const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetailsV2(true),
  );
};

describe(SmokeConfirmationsRedesigned('Send SOL token'), () => {
  it('should send solana to an address', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        // await device.disableSynchronization();
        await WalletView.tapOnSolana();
        await TokenOverview.tapSendButton();
        await device.disableSynchronization();
        // using 0 value as balance of SOL is not loaded at times making test flaky
        await SendView.enterZeroAmount();
        await SendView.pressContinueButton();
        await SendView.inputRecipientAddress(RECIPIENT);
        await SendView.pressReviewButton();
        await SolanaTestDApp.tapCancelButton();
      },
    );
  });
});
