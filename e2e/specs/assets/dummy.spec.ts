import { SmokeWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { DappVariants } from '../../framework/Constants';

describe(
  SmokeWalletPlatform('Dummy'),
  () => {
    it('should display dummy', async () => {
      // Test setup with fixtures
      await withFixtures(
        {
          dapps: [
            {
              dappVariant: DappVariants.TEST_DAPP,
            },
          ],
          fixture: new FixtureBuilder()
            .build(),
        },
        async () => {
          await loginToApp();
        },
      );
    });
  },
);