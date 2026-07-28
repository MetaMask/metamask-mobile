import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeSnaps } from '../../tags.js';
import TestSnaps from '../../page-objects/Browser/TestSnaps.js';
import { loginAndOpenTestSnaps } from '../../flows/snaps.flow.js';
import { withSnapsFixtures } from './helpers/snap-smoke.helpers.js';

appiumTest.describe(SmokeSnaps('Manage State Snap Tests'), () => {
  appiumTest(
    'connects to the State Snap and manages new encrypted and unencrypted state',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectStateButton');

        await TestSnaps.fillMessage('dataStateInput', '"bar"');
        await TestSnaps.fillMessage('setStateKeyInput', 'foo');
        await TestSnaps.tapButton('sendStateButton');
        await TestSnaps.checkResultJson('encryptedStateResultSpan', {
          foo: 'bar',
        });

        await TestSnaps.fillMessage('getStateInput', 'foo');
        await TestSnaps.tapButton('sendGetStateButton');
        await TestSnaps.checkResultSpan('getStateResultSpan', '"bar"');

        await TestSnaps.tapButton('clearStateButton');
        await TestSnaps.checkResultSpan('encryptedStateResultSpan', 'null');

        await TestSnaps.fillMessage('dataUnencryptedStateInput', '"bar"');
        await TestSnaps.fillMessage('setStateKeyUnencryptedInput', 'foo');
        await TestSnaps.tapButton('sendUnencryptedStateButton');
        await TestSnaps.checkResultJson('unencryptedStateResultSpan', {
          foo: 'bar',
        });

        await TestSnaps.fillMessage('getUnencryptedStateInput', 'foo');
        await TestSnaps.tapButton('sendGetUnencryptedStateButton');
        await TestSnaps.checkResultSpan(
          'getStateUnencryptedResultSpan',
          '"bar"',
        );

        await TestSnaps.tapButton('clearStateUnencryptedButton');
        await TestSnaps.checkResultSpan('unencryptedStateResultSpan', 'null');
      });
    },
  );

  appiumTest(
    'manages legacy encrypted and unencrypted state',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withSnapsFixtures(currentDeviceDetails, {}, async () => {
        await loginAndOpenTestSnaps();
        await TestSnaps.installSnap('connectStateButton');

        await TestSnaps.fillMessage('dataManageStateInput', '23');
        await TestSnaps.tapButton('sendManageStateButton');
        await TestSnaps.checkResultSpan('sendManageStateResultSpan', 'true');
        await TestSnaps.checkResultJson('retrieveManageStateResultSpan', {
          items: ['23'],
        });

        await TestSnaps.tapButton('clearManageStateButton');
        await TestSnaps.checkResultSpan('clearManageStateResultSpan', 'true');
        await TestSnaps.checkResultJson('retrieveManageStateResultSpan', {
          items: [],
        });

        await TestSnaps.fillMessage('dataUnencryptedManageStateInput', '23');
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
      });
    },
  );
});
