import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Get File Snap Tests'), () => {
  it('can connect to the get File Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectGetFileButton');
      },
    );
  });

  it('returns responses for different formats', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
      },
      async () => {
        await TestSnaps.tapButton('sendGetFileTextButton');
        await TestSnaps.checkResultJson('fileResultSpan', { foo: 'bar' });

        await TestSnaps.tapButton('sendGetFileBase64Button');
        await TestSnaps.checkResultSpan(
          'fileResultSpan',
          '"ewogICJmb28iOiAiYmFyIgp9Cg=="',
        );

        await TestSnaps.tapButton('sendGetFileHexButton');
        await TestSnaps.checkResultSpan(
          'fileResultSpan',
          '"0x7b0a202022666f6f223a2022626172220a7d0a"',
        );
      },
    );
  });
});
