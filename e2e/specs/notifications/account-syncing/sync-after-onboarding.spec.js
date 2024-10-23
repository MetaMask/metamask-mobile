import {
  withFixtures,
  defaultGanacheOptions,
  startFixtureServer,
  loadFixture,
} from '../../../fixtures/fixture-helper';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import { mockNotificationServices } from '../mocks';
import {
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
} from '../constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../mockServer/mockServer';
import { UserStorageMockttpController } from '../../../utils/user-storage/userStorageMockttpController';
import { accountsSyncMockResponse } from './mockData';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import FixtureServer from '../../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../../fixtures/utils';

describe('Account syncing', () => {
  it('retrieves all previously synced accounts', async () => {
    // const fixtureServer = new FixtureServer();
    const userStorageMockttpController = new UserStorageMockttpController();

    // await TestHelpers.reverseServerPort();
    // const fixture = new FixtureBuilder().withGanacheNetwork().build();
    // await startFixtureServer(fixtureServer);
    // await loadFixture(fixtureServer, { fixture });

    // const mockServer = await startMockServer({
    //   // Configure mock server
    //   mockUrl: 'https://user-storage.api.cx.metamask.io/api/v1/userstorage',
    // });

    // userStorageMockttpController.setupPath('accounts', mockServer, {
    //   getResponse: accountsSyncMockResponse,
    // });

    // mockNotificationServices(mockServer, userStorageMockttpController);

    jest.setTimeout(200000);

    await device.launchApp();

    await importWalletWithRecoveryPhrase(
      NOTIFICATIONS_TEAM_SEED_PHRASE,
      NOTIFICATIONS_TEAM_PASSWORD,
    );
  });
});
