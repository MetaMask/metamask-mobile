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
import Assertions from '../../../framework/Assertions';
import TokenOverview from '../../../pages/wallet/TokenOverview';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import TestHelpers from '../../../helpers';
import SendView from '../../../pages/Send/SendView';

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

  afterEach(async () => {
    // To reset the token list view after each test
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
    await Assertions.expectElementToBeVisible(eth);
    await WalletView.scrollToToken(AVAX_NAME);
    await Assertions.expectElementToBeVisible(avax);
    await WalletView.scrollToToken(BNB_NAME);
    await Assertions.expectElementToBeVisible(bnb);
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterCurrent();
    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    const avax = WalletView.tokenInWallet(AVAX_NAME);
    const bnb = WalletView.tokenInWallet(BNB_NAME);
    await Assertions.expectElementToBeVisible(eth);
    await Assertions.expectElementToNotBeVisible(avax);
    await Assertions.expectElementToNotBeVisible(bnb);
  });

  it.each([
    { tokenName: 'AVAX', networkName: 'Avalanche C-Chain' },
    { tokenName: 'BNB', networkName: 'BNB Smart Chain' }
  ])('should switch networks when clicking on send if an asset on a different network is selected - %s', async ({ tokenName, networkName }) => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await WalletView.scrollToToken(tokenName);
    await WalletView.tapOnToken(tokenName);
    await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
    await TokenOverview.tapSendButton();
    await Assertions.expectElementToBeVisible(NetworkEducationModal.container);
    await Assertions.expectElementToHaveText(
      NetworkEducationModal.networkName,
      networkName,
    );
    await NetworkEducationModal.tapGotItButton();
    if (tokenName === 'AVAX')  await SendView.tapCancelButton();
  });

  it('should allows clicking into the asset details page of native token on another network', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();

    await WalletView.scrollToToken(AVAX_NAME);
    await WalletView.tapOnToken('AVAX');

    await Assertions.expectElementToBeVisible(TokenOverview.container);
    await TokenOverview.tapChartPeriod1d();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1d);
    await TokenOverview.tapChartPeriod1w();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1w);
    await TokenOverview.tapChartPeriod1m();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1m);
    await TokenOverview.tapChartPeriod3m();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod3m);
    await TokenOverview.tapChartPeriod1y();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod1y);
    await TokenOverview.tapChartPeriod3y();
    await Assertions.expectElementToBeVisible(TokenOverview.chartPeriod3y);

    await TokenOverview.scrollOnScreen();
    await Assertions.expectElementToBeVisible(TokenOverview.receiveButton);
    await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
  });
});
