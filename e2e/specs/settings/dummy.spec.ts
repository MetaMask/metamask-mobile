import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
describe(SmokeWalletPlatform('Dummy Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should add an ENS address via the contacts view and edit it', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
      },
    );
  });
});
