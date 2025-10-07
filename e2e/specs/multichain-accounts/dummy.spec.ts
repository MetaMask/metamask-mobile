import { SmokeWalletPlatform } from '../../tags';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';

describe(SmokeWalletPlatform('Multichain Accounts: Dummy'), () => {
  it('dummy', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await loginToApp();
        await new Promise((resolve) => setTimeout(resolve, 10000));
      },
    );
  });
});
