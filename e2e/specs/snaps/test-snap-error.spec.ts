import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { FlaskBuildTests } from '../../tags';

import TestSnaps from '../../pages/Browser/TestSnaps';
import { loginToApp } from '../../viewHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Error Snap Tests'), () => {
  it('connects to the Error Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectErrorSnapButton');
      },
    );
  });

  it('can throw an error', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('sendErrorButton');
        await TestSnaps.checkResultSpan('errorResultSpan', '"Hello, world!"');
      },
    );
  });
});
