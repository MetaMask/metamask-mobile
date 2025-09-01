import { RegressionAssets } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../framework/Assertions';
import TokenOverview from '../../../pages/wallet/TokenOverview';
import NetworkEducationModal from '../../../pages/Network/NetworkEducationModal';
import QuoteView from '../../../pages/Bridge/QuoteView';

const ETHEREUM_NAME = 'Ethereum';
const AVAX_NAME = 'AVAX';
const BNB_NAME = 'BNB';

describe(RegressionAssets('Import Tokens'), () => {
  it('should display tokens across networks when all networks filter is toggled on', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterAll();
        const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
        await Assertions.expectElementToBeVisible(eth);
        const avax = WalletView.tokenInWallet(AVAX_NAME);
        await Assertions.expectElementToBeVisible(avax);
        await WalletView.scrollToToken(BNB_NAME);
        const bnb = WalletView.tokenInWallet(BNB_NAME);
        await Assertions.expectElementToBeVisible(bnb);
      },
    );
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
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
      },
    );
  });

  it('should switch networks when clicking on send if an asset on a different network is selected', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        const AVAX_NETWORK_NAME = 'Avalanche C-Chain';
        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterAll();
        const avax = WalletView.tokenInWallet('AVAX');
        await WalletView.scrollToToken('AVAX');
        await Assertions.expectElementToBeVisible(avax);
        await WalletView.tapOnToken('AVAX');
        await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
        await TokenOverview.tapSendButton();
        await Assertions.expectElementToBeVisible(
          NetworkEducationModal.container,
        );
        await Assertions.expectElementToHaveText(
          NetworkEducationModal.networkName,
          AVAX_NETWORK_NAME,
        );
        await NetworkEducationModal.tapGotItButton();
      },
    );
  });

  it('should switch networks when clicking on swap if an asset on a different network is selected', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterAll();
        await WalletView.scrollToToken('BNB');
        const bnb = WalletView.tokenInWallet('BNB');
        await Assertions.expectElementToBeVisible(bnb);
        await WalletView.tapOnToken('BNB');
        await TokenOverview.tapSwapButton();
        await QuoteView.tapOnCancelButton();
        await TokenOverview.tapBackButton();
        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterCurrent();
        const bnbCurrentNetwork = WalletView.tokenInWallet('BNB');
        await Assertions.expectElementToBeVisible(bnbCurrentNetwork);
      },
    );
  });

  it('should allows clicking into the asset details page of native token on another network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();

        await WalletView.tapTokenNetworkFilter();
        await WalletView.tapTokenNetworkFilterAll();
        await WalletView.scrollToToken('AVAX');
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
      },
    );
  });
});
