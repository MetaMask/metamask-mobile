import { FlaskBuildTests } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';

describe(FlaskBuildTests('Dummy To test Flask Builds'), () => {
  it('should display dummy to test Flask Builds', async () => {
    // Test setup with fixtures
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
