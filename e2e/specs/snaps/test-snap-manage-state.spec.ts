import TestHelpers from '../../helpers';
import { FlaskBuildTests } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import TestSnaps from '../../pages/Browser/TestSnaps';

const fixtureServer = new FixtureServer();

describe(FlaskBuildTests('Manage State Snap Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withMultiSRPKeyringController()
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();

    // Navigate to test snaps URL once for all tests
    await TabBarComponent.tapBrowser();
    await TestSnaps.navigateToTestSnap();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150_000);
  });

  describe('new state functions', () => {
    it.only('connects to the State Snap', async () => {
      await TestSnaps.installSnap('connectStateButton');
    });

    describe('encrypted state', () => {
      it('sets and retrieves state', async () => {
        await TestSnaps.fillMessage('dataStateInput', '"bar"');
        await TestSnaps.fillMessage('setStateKeyInput', 'foo');
        await TestSnaps.tapButton('sendStateButton');
        await TestSnaps.checkResultSpan(
          'encryptedStateResultSpan',
          JSON.stringify({ foo: 'bar' }, null, 2),
        );

        await TestSnaps.fillMessage('getStateInput', 'foo');
        await TestSnaps.tapButton('sendGetStateButton');
        await TestSnaps.checkResultSpan('getStateResultSpan', '"bar"');
      });

      it('clears the state', async () => {
        await TestSnaps.tapButton('clearStateButton');
        await TestSnaps.checkResultSpan('encryptedStateResultSpan', 'null');
      });
    });

    describe('unencrypted state', () => {
      it('sets and retrieves unencrypted state', async () => {
        await TestSnaps.fillMessage('dataUnencryptedStateInput', '"bar"');
        await TestSnaps.fillMessage('setStateKeyUnencryptedInput', 'foo');
        await TestSnaps.tapButton('sendUnencryptedStateButton');
        await TestSnaps.checkResultSpan(
          'unencryptedStateResultSpan',
          JSON.stringify({ foo: 'bar' }, null, 2),
        );

        await TestSnaps.fillMessage('getUnencryptedStateInput', 'foo');
        await TestSnaps.tapButton('sendGetUnencryptedStateButton');
        await TestSnaps.checkResultSpan(
          'getStateUnencryptedResultSpan',
          '"bar"',
        );
      });

      it('clears the unencrypted state', async () => {
        await TestSnaps.tapButton('clearStateUnencryptedButton');
        await TestSnaps.checkResultSpan('unencryptedStateResultSpan', 'null');
      });
    });
  });

  describe('legacy state functions', () => {
    describe('encrypted state', () => {
      it('sets and retrieves state', async () => {
        await TestSnaps.fillMessage('dataManageStateInput', '23');
        await TestSnaps.tapButton('sendManageStateButton');
        await TestSnaps.checkResultSpan('sendManageStateResultSpan', 'true');
        await TestSnaps.checkResultSpan(
          'retrieveManageStateResultSpan',
          JSON.stringify({ items: ['23'] }, null, 2),
        );
      });

      it('clears the state', async () => {
        await TestSnaps.tapButton('clearManageStateButton');
        await TestSnaps.checkResultSpan('clearManageStateResultSpan', 'true');
        await TestSnaps.checkResultSpan(
          'retrieveManageStateResultSpan',
          JSON.stringify({ items: [] }, null, 2),
        );
      });
    });

    describe('unencrypted state', () => {
      it('sets and retrieves unencrypted state', async () => {
        await TestSnaps.fillMessage('dataUnencryptedManageStateInput', '23');
        await TestSnaps.tapButton('sendUnencryptedManageStateButton');
        await TestSnaps.checkResultSpan(
          'retrieveManageStateUnencryptedResultSpan',
          JSON.stringify({ items: ['23'] }, null, 2),
        );
      });

      it('clears the unencrypted state', async () => {
        await TestSnaps.tapButton('clearUnencryptedManageStateButton');
        await TestSnaps.checkResultSpan(
          'clearUnencryptedManageStateResultSpan',
          'true',
        );
        await TestSnaps.checkResultSpan(
          'retrieveManageStateUnencryptedResultSpan',
          JSON.stringify({ items: [] }, null, 2),
        );
      });
    });
  });
});
