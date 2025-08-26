import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { SmokeTrade } from '../../tags';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import PerpsHomeView from '../../pages/Perps/PerpsHomeView';

describe(SmokeTrade('Perps - open from Wallet tab and start trading'), () => {
  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('should switch to Perps tab and tap Start Trading', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withMetaMetricsOptIn()
          .withPerpsFeatureFlagEnabled()
          .build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await WalletView.expectPerpsTabLoaded();

        await WalletView.tapPerpsTab();

        await PerpsHomeView.tapStartTrading();
        await PerpsHomeView.completeTutorialAndTapAddFunds();
      },
    );
  });
});
