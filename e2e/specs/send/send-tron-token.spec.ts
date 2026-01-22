import SendView from '../../pages/Send/RedesignedSendView';
import TokenOverview from '../../pages/wallet/TokenOverview';
import WalletView from '../../pages/wallet/WalletView';
import { SmokeConfirmationsRedesigned } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagTronAccounts,
  remoteFeatureMultichainAccountsAccountDetailsV2,
} from '../../api-mocking/mock-responses/feature-flags-mocks';
import { loginToApp } from '../../viewHelper';

describe(SmokeConfirmationsRedesigned('Send TRX token'), () => {
  it('shows insufficient funds', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagTronAccounts(true),
            ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
          });
        },
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnToken('Tron');
        await TokenOverview.tapSendButton();
        await SendView.enterZeroAmount();
        await SendView.checkInsufficientFundsError();
      },
    );
  });
});
