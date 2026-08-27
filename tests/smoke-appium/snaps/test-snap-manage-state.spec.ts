import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Manage State Snap Tests'), () => {
  // Merged set/get/clear per section; Android WebView scrolls are slow on CI/local.
  appiumTest.describe.configure({ mode: 'serial', timeout: 300_000 });

  appiumTest(
    'connects to the State Snap',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(
        currentDeviceDetails,
        { restartDevice: true },
        async () => {
          await loginAndOpenTestSnaps();
          await TestSnaps.installSnap('connectStateButton');
        },
      );
    },
  );

  appiumTest.describe('new state functions', () => {
    appiumTest(
      'encrypted state: sets, retrieves, and clears',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.fillMessage('dataStateInput', '"bar"');
            await TestSnaps.fillMessage('setStateKeyInput', 'foo');
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendStateButton');
            await TestSnaps.checkResultJson('encryptedStateResultSpan', {
              foo: 'bar',
            });

            await TestSnaps.fillMessage('getStateInput', 'foo');
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendGetStateButton');
            await TestSnaps.checkResultSpan('getStateResultSpan', '"bar"');

            // Clear while still in the encrypted section — avoid a lone
            // clear+assert after the viewport has moved elsewhere.
            await TestSnaps.tapButton('clearStateButton');
            await TestSnaps.checkResultSpan('encryptedStateResultSpan', 'null');
          },
        );
      },
    );

    appiumTest(
      'unencrypted state: sets, retrieves, and clears',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.fillMessage('dataUnencryptedStateInput', '"bar"');
            await TestSnaps.fillMessage('setStateKeyUnencryptedInput', 'foo');
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendUnencryptedStateButton');
            await TestSnaps.checkResultJson('unencryptedStateResultSpan', {
              foo: 'bar',
            });

            await TestSnaps.fillMessage('getUnencryptedStateInput', 'foo');
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendGetUnencryptedStateButton');
            await TestSnaps.checkResultSpan(
              'getStateUnencryptedResultSpan',
              '"bar"',
            );

            await TestSnaps.tapButton('clearStateUnencryptedButton');
            await TestSnaps.checkResultSpan(
              'unencryptedStateResultSpan',
              'null',
            );
          },
        );
      },
    );
  });

  appiumTest.describe('legacy state functions', () => {
    appiumTest(
      'encrypted state: sets, retrieves, and clears',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.fillMessage('dataManageStateInput', '23');
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendManageStateButton');
            await TestSnaps.checkResultSpan(
              'sendManageStateResultSpan',
              'true',
            );
            await TestSnaps.checkResultJson('retrieveManageStateResultSpan', {
              items: ['23'],
            });

            await TestSnaps.tapButton('clearManageStateButton');
            await TestSnaps.checkResultSpan(
              'clearManageStateResultSpan',
              'true',
            );
            await TestSnaps.checkResultJson('retrieveManageStateResultSpan', {
              items: [],
            });
          },
        );
      },
    );

    appiumTest(
      'unencrypted state: sets, retrieves, and clears',
      async ({ driver: _driver, currentDeviceDetails }) => {
        await withSnapsFixtures(
          currentDeviceDetails,
          { restartDevice: false },
          async () => {
            await TestSnaps.fillMessage(
              'dataUnencryptedManageStateInput',
              '23',
            );
            await TestSnaps.blurActiveWebViewInput();
            await TestSnaps.tapButton('sendUnencryptedManageStateButton');
            await TestSnaps.checkResultJson(
              'retrieveManageStateUnencryptedResultSpan',
              { items: ['23'] },
            );

            await TestSnaps.tapButton('clearUnencryptedManageStateButton');
            await TestSnaps.checkResultSpan(
              'clearUnencryptedManageStateResultSpan',
              'true',
            );
            await TestSnaps.checkResultJson(
              'retrieveManageStateUnencryptedResultSpan',
              { items: [] },
            );
          },
        );
      },
    );
  });
});
