import SendView from '../../../page-objects/Send/RedesignedSendView';
import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import Assertions from '../../../framework/Assertions';
import NetworkListModal from '../../../page-objects/Network/NetworkListModal';

const TOKEN = 'Bitcoin';

describe(SmokeConfirmations('Send Bitcoin'), () => {
  it('shows insufficient funds', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await Assertions.expectElementToNotBeVisible(
          WalletView.balanceEmptyStateContainer,
          {
            description: 'Balance empty state container should not be visible',
            timeout: 30000,
          },
        );
        await WalletView.tapTokenNetworkFilter();
        await NetworkListModal.changeNetworkTo(TOKEN);
        await WalletView.tapOnToken(TOKEN, 1);
        await TokenOverview.tapSendButton();
        await SendView.enterZeroAmount();
        await SendView.checkInsufficientFundsError();
      },
    );
  });
});
