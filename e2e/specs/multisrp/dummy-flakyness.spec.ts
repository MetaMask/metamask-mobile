import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';

describe(
  SmokeWalletPlatform('Dummy test Suite used for testing flakyness'),
  () => {
    it('dummy test', async () => {
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
