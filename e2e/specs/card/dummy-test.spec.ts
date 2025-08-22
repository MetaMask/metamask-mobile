import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokeCard } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { loginToApp } from '../../viewHelper';

describe(SmokeCard('Dummy Test'), () => {
  it('should pass', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        // Adding a sleep
        await new Promise((resolve) => setTimeout(resolve, 10000));
      },
    );
  });
});
