// 'persists the preferred asset list preference when changing networks'

import { SmokeNetworkAbstractions } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../../fixtures/fixture-helper';
import FixtureServer from '../../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../../fixtures/utils';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../utils/Assertions';
import TokenOverview from '../../../pages/wallet/TokenOverview';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import TestHelpers from '../../../helpers';
import SendView from '../../../pages/Send/SendView';

import QuoteView from '../../../pages/swaps/QuoteView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';

const fixtureServer = new FixtureServer();

const ETHEREUM_NAME = 'Ethereum';
const AVAX_NAME = 'AVAX';
const BNB_NAME = 'BNB';

describe(SmokeNetworkAbstractions('Import Tokens'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().withPopularNetworks().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
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
    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    const avax = WalletView.tokenInWallet(AVAX_NAME);
    const bnb = WalletView.tokenInWallet(BNB_NAME);
    await Assertions.checkIfVisible(eth);
    await Assertions.checkIfVisible(avax);
    await Assertions.checkIfVisible(bnb);
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterCurrent();
    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    const avax = WalletView.tokenInWallet(AVAX_NAME);
    const bnb = WalletView.tokenInWallet(BNB_NAME);
    await Assertions.checkIfVisible(eth);
    await Assertions.checkIfNotVisible(avax);
    await Assertions.checkIfNotVisible(bnb);
  });

  it.skip('should switch networks when clicking on swap if an asset on a different network is selected', async () => {
    const BNB_NAME = 'BNB Smart Chain';
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.checkIfVisible(bnb);
    await WalletView.tapOnToken('BNB');
    await TestHelpers.delay(5000);
    await TokenOverview.tapSwapButton();

    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      BNB_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
    await QuoteView.tapOnCancelButton();
  });

  it('should switch networks when clicking on send if an asset on a different network is selected', async () => {
    const BNB_NAME = 'BNB Smart Chain';
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.checkIfVisible(bnb);
    await WalletView.tapOnToken('BNB');
    await Assertions.checkIfVisible(TokenOverview.sendButton);
    await TokenOverview.tapSendButton();

    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      BNB_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
  });

  it('should allows clicking into the asset details page of native token on another network', async () => {
    await SendView.tapCancelButton();
    await TabBarComponent.tapWallet();
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await WalletView.tapOnToken('AVAX');

    await Assertions.checkIfVisible(TokenOverview.container);
    await TokenOverview.tapChartPeriod1d();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1d);
    await TokenOverview.tapChartPeriod1w();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1w);
    await TokenOverview.tapChartPeriod1m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1m);
    await TokenOverview.tapChartPeriod3m();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3m);
    await TokenOverview.tapChartPeriod1y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod1y);
    await TokenOverview.tapChartPeriod3y();
    await Assertions.checkIfVisible(TokenOverview.chartPeriod3y);

    await TokenOverview.scrollOnScreen();
    await Assertions.checkIfVisible(TokenOverview.receiveButton);
    await Assertions.checkIfVisible(TokenOverview.sendButton);
  });
});
