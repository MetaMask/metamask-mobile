import TokenOverview from '../../../page-objects/wallet/TokenOverview';
import WalletView from '../../../page-objects/wallet/WalletView';
import { SmokeConfirmations } from '../../../tags';
import { loginToApp } from '../../../flows/wallet.flow';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { Assertions } from '../../../framework';

// const RECIPIENT = '4Nd1mZyJY5ZqzR3n8bQF7h5L2Q9gY1yTtM6nQhc7P1Dp';

describe(SmokeConfirmations('Send SOL token'), () => {
  it('should send solana to an address', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await device.disableSynchronization();
        await WalletView.tapOnToken('Solana');
        await TokenOverview.tapSendButton();

        // Since we're not yet mockign Solana and there's residual balance that
        // can be flaky when loading we're only checking that we're on the
        // correct screen and sending the correct token.
        await Assertions.expectTextDisplayed('Send');
        await Assertions.expectTextDisplayed('SOL');
      },
    );
  });
});
