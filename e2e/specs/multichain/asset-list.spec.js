// 'persists the preferred asset list preference when changing networks'

import { SmokeMultiChain } from '../../tags';
import WalletView from '../../pages/wallet/WalletView';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import { loginToApp } from '../../viewHelper';
import Assertions from '../../utils/Assertions';

const fixtureServer = new FixtureServer();

describe(SmokeMultiChain('Import Tokens'), () => {
  beforeAll(async () => {
    const fixture = new FixtureBuilder().withPopularNetworks().build();
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

  it('should display tokens across networks when all networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    const eth = WalletView.tokenInWallet('Ethereum');
    const avax = WalletView.tokenInWallet('AVAX');
    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.checkIfVisible(eth);
    await Assertions.checkIfVisible(avax);
    await Assertions.checkIfVisible(bnb);
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterCurrent();
    const eth = WalletView.tokenInWallet('Ethereum');
    const avax = WalletView.tokenInWallet('AVAX');
    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.checkIfVisible(eth);
    await Assertions.checkIfNotVisible(avax);
    await Assertions.checkIfNotVisible(bnb);
  });
});

// TODO:

// 'allows clicking into the asset details page of native token on another network'

// 'switches networks when clicking on send for a token on another network'

// 'switches networks when clicking on swap for a token on another network'
