import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Get File Snap Tests'), () => {
  appiumTest(
    'can connect to the get File Snap and returns responses for different formats',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectGetFileButton');

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
      });
    },
  );
});
