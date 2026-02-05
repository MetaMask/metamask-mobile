import { FlaskBuildTests } from '../../../e2e/tags';
import { loginToApp, navigateToBrowserView } from '../../../e2e/viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import TestSnaps from '../../../e2e/pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Get File Snap Tests'), () => {
  it('can connect to the get File Snap', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        skipReactNativeReload: true,
      },
      async () => {
        await loginToApp();
        await navigateToBrowserView();
        await TestSnaps.navigateToTestSnap();

        await TestSnaps.installSnap('connectGetFileButton');
      },
    );
  });

  it('returns responses for different formats', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        skipReactNativeReload: true,
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
