import { RegressionWalletUX } from '../../../tags';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../../flows/wallet.flow';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import AccountMenu from '../../../page-objects/AccountMenu/AccountMenu';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';

describe.skip(RegressionWalletUX('Settings'), () => {
  it('Open contact support', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapAccountsMenu();
        await AccountMenu.tapSupport();
      },
    );
  });
});
