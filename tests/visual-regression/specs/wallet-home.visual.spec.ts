import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../flows/wallet.flow';
import WalletView from '../../page-objects/wallet/WalletView';
import { Assertions } from '../../framework';
import { VisualRegression } from '../../tags';
import { visualCheck } from '../visual-check';
import { createTestConfig } from '../ai/visual-test-config';
describe(VisualRegression('Wallet Home'), () => {
  it('wallet home screen matches baseline', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Wait for wallet to fully load (tokens, balance, etc.)
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet container should be visible',
        });

        // Allow dynamic content to settle (token prices, portfolio balance)
        await new Promise((resolve) => setTimeout(resolve, 3000));

        await visualCheck('wallet-home', createTestConfig.walletHome());
      },
    );
  });
});
