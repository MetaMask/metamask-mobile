import FixtureBuilder from '../../fixtures/fixture-builder';
import TestHelpers from '../../helpers';
import { GHMigration } from '../../tags';
import { withFixtures } from '../../fixtures/fixture-helper';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../framework/Assertions';

describe(GHMigration('GH Migration'), () => {
  it('should migrate the wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Purposely wait in case we need to debug something in CI
        await TestHelpers.delay(10000);
        await Assertions.checkIfTextMatches('Onboarding', 'Onboarding');
      },
    );
  });
});
