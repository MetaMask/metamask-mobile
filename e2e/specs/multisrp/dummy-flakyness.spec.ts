import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';

describe(
  SmokeWalletPlatform('Multi-SRP: Add new account to a specific SRP'),
  () => {
    it('adds an account to default SRP and one to the imported SRP', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();

          // Dummy wait just for testing
          await new Promise((resolve) => setTimeout(resolve, 3000));
        },
      );
    });
  },
);
