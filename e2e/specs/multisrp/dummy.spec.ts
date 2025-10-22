import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';

describe(SmokeWalletPlatform('Dummy: Wait 10 seconds'), () => {
  it('adds an account to default SRP and one to the imported SRP', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await new Promise((resolve) => setTimeout(resolve, 10000));
      },
    );
  });
});
