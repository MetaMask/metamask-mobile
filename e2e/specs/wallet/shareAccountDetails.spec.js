'use strict';
import { loginToApp } from '../../viewHelper';
// import WalletView from '../../pages/WalletView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import FixtureServer from '../../fixtures/fixture-server';

import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import { Regression } from '../../tags';

const fixtureServer = new FixtureServer();

describe(Regression('Account component'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(async () => {
    jest.setTimeout(150000);
  });

  it('share public address', async () => {
    await TestHelpers.waitAndTap('main-wallet-account-actions');
    await TestHelpers.tap('share-address-action');
  });
});
