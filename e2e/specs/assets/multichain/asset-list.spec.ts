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
import QuoteView from '../../../pages/Bridge/QuoteView';

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
    // Wait for network filter to apply and layout to stabilize
    await TestHelpers.delay(2000);

    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    await Assertions.expectElementToBeVisible(eth);
    const avax = WalletView.tokenInWallet(AVAX_NAME);
    await Assertions.expectElementToBeVisible(avax);

    // Ensure BNB is visible by scrolling more aggressively
    await WalletView.scrollToToken(BNB_NAME);
    await TestHelpers.delay(1000); // Wait for scroll to complete
    const bnb = WalletView.tokenInWallet(BNB_NAME);
    await Assertions.expectElementToBeVisible(bnb);
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await TestHelpers.delay(1000); // Wait for filter to apply
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterCurrent();
    await TestHelpers.delay(2000); // Wait for network filter to apply and layout to stabilize

    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    const avax = WalletView.tokenInWallet(AVAX_NAME);
    const bnb = WalletView.tokenInWallet(BNB_NAME);
    await Assertions.expectElementToBeVisible(eth);
    await Assertions.expectElementToNotBeVisible(avax);
    await Assertions.expectElementToNotBeVisible(bnb);
  });

  it('should switch networks when clicking on send if an asset on a different network is selected', async () => {
    const AVAX_NETWORK_NAME = 'Avalanche C-Chain';
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // Wait for network filter to apply and layout to stabilize
    await TestHelpers.delay(2000);

    // Scroll to top first to ensure consistent starting position
    await WalletView.scrollDownOnTokensTab();
    await TestHelpers.delay(1000);

    // Then scroll to AVAX with more aggressive scrolling
    await WalletView.scrollToToken('AVAX');
    await TestHelpers.delay(1500); // Extra time for scroll to complete

    const avax = WalletView.tokenInWallet('AVAX');
    await Assertions.expectElementToBeVisible(avax);
    await WalletView.tapOnToken('AVAX');
    await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
    await TokenOverview.tapSendButton();
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      AVAX_NETWORK_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
    // Wait for navigation to complete and return to stable state
    await TestHelpers.delay(3000);
  });

  it('should switch networks when clicking on swap if an asset on a different network is selected', async () => {
    // Ensure we're in a clean state before starting - cancel any open send flow
    try {
      await SendView.tapCancelButton();
      await TestHelpers.delay(2000); // Wait for cancel to complete
    } catch (e) {
      // If cancel button doesn't exist, we're not in send flow, which is fine
    }

    const BNB_NETWORK_NAME = 'BNB Smart Chain';
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // Wait for network filter to apply and layout to stabilize
    await TestHelpers.delay(2000);

    // Scroll to top first to ensure consistent starting position
    await WalletView.scrollDownOnTokensTab();
    await TestHelpers.delay(1000);

    // Then scroll to BNB with more aggressive scrolling
    await WalletView.scrollToToken('BNB');
    await TestHelpers.delay(1500); // Extra time for scroll to complete

    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.expectElementToBeVisible(bnb);
    await WalletView.tapOnToken('BNB');
    await TokenOverview.tapSwapButton();
    await Assertions.expectElementToBeVisible(NetworkEducationModal.container);
    await Assertions.expectElementToHaveText(
      NetworkEducationModal.networkName,
      BNB_NETWORK_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
    await QuoteView.tapOnCancelButton();
    // Wait for navigation to complete and return to stable state
    await TestHelpers.delay(3000);
  });

  it('should allows clicking into the asset details page of native token on another network', async () => {
    // Ensure we're back in wallet view and UI is stable
    try {
      await TokenOverview.tapBackButton();
      await TestHelpers.delay(2000); // Wait for back navigation to complete
    } catch (e) {
      // If back button doesn't exist, we might already be in wallet view
    }

    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // Wait for network filter to apply and layout to stabilize
    await TestHelpers.delay(2000);

    // Scroll to top first to ensure consistent starting position
    await WalletView.scrollDownOnTokensTab();
    await TestHelpers.delay(1000);

    // Then scroll to AVAX with more aggressive scrolling
    await WalletView.scrollToToken('AVAX', 'up');
    await TestHelpers.delay(1500); // Extra time for scroll to complete

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
