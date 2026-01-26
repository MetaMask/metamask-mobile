import { FlaskBuildTests } from '../../tags';
import { loginToApp, navigateToBrowserView } from '../../viewHelper';
import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import TestSnaps from '../../pages/Browser/TestSnaps';

jest.setTimeout(150_000);

describe(FlaskBuildTests('Manage State Snap Tests'), () => {
  it('connects to the State Snap', async () => {
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

        await TestSnaps.installSnap('connectStateButton');
      },
    );
  });

  describe('new state functions', () => {
    describe('encrypted state', () => {
      it('sets and retrieves state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
            await TestSnaps.fillMessage('dataStateInput', '"bar"');
            await TestSnaps.fillMessage('setStateKeyInput', 'foo');
            await TestSnaps.tapButton('sendStateButton');
            await TestSnaps.checkResultJson('encryptedStateResultSpan', {
              foo: 'bar',
            });

            await TestSnaps.fillMessage('getStateInput', 'foo');
            await TestSnaps.tapButton('sendGetStateButton');
            await TestSnaps.checkResultSpan('getStateResultSpan', '"bar"');
          },
        );
      });

      it('clears the state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
            await TestSnaps.tapButton('clearStateButton');
            await TestSnaps.checkResultSpan('encryptedStateResultSpan', 'null');
          },
        );
      });
    });

    describe('unencrypted state', () => {
      it('sets and retrieves unencrypted state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
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
          },
        );
      });

      it('clears the unencrypted state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
            await TestSnaps.tapButton('clearStateUnencryptedButton');
            await TestSnaps.checkResultSpan(
              'unencryptedStateResultSpan',
              'null',
            );
          },
        );
      });
    });
  });

  describe('legacy state functions', () => {
    describe('encrypted state', () => {
      it('sets and retrieves state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
            await TestSnaps.fillMessage('dataManageStateInput', '23');
            await TestSnaps.tapButton('sendManageStateButton');
            await TestSnaps.checkResultSpan(
              'sendManageStateResultSpan',
              'true',
            );
            await TestSnaps.checkResultJson('retrieveManageStateResultSpan', {
              items: ['23'],
            });
          },
        );
      });

      it('clears the state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
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
      });
    });

    describe('unencrypted state', () => {
      it('sets and retrieves unencrypted state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
            await TestSnaps.fillMessage(
              'dataUnencryptedManageStateInput',
              '23',
            );
            await TestSnaps.tapButton('sendUnencryptedManageStateButton');
            await TestSnaps.checkResultJson(
              'retrieveManageStateUnencryptedResultSpan',
              { items: ['23'] },
            );
          },
        );
      });

      it('clears the unencrypted state', async () => {
        await withFixtures(
          {
            fixture: new FixtureBuilder().build(),
            skipReactNativeReload: true,
          },
          async () => {
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
      });
    });
  });
});
