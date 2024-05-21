'use strict';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { CustomNetworks } from '../../resources/networks.e2e';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { SmokeCore } from '../../tags';
import WalletView from '../../pages/WalletView';
import DetectedTokensView from '../../pages/assets/DetectedTokensView';
import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Import all tokens detected'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder()
      .withNetworkController(CustomNetworks.Tenderly)
      .build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  it('should import all tokens detected', async () => {
    await WalletView.tapNewTokensFound();
    await DetectedTokensView.tapImport();
  });

  it('should land on wallet view after tokens detected', async () => {
    // just an assertion to check the tokens have been imported
    await Assertions.checkIfTextIsDisplayed('Chainlink');
  });

  it('should show toast alert for tokens imported', async () => {});
});
