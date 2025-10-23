import { RegressionAccounts } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';

describe(RegressionAccounts('Dummy'), () => {
  it('execute a dummy', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await new Promise((resolve) => setTimeout(resolve, 20000));
      },
    );
  });
});
