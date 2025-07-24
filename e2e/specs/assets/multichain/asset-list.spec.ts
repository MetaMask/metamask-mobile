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
    // Wait for network filter to apply - reduced delay due to efficient positioning
    const platformDelay = device.getPlatform() === 'android' ? 3000 : 2000;
    await TestHelpers.delay(platformDelay);

    const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
    await Assertions.expectElementToBeVisible(eth);

    // Use new smart positioning method - no extra settling time needed
    await WalletView.ensureTokenIsFullyVisible(AVAX_NAME);

    // Use new smart positioning method - no extra settling time needed
    await WalletView.ensureTokenIsFullyVisible(BNB_NAME);
  });

  it('should display tokens of current network when current networks filter is toggled on', async () => {
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    await TestHelpers.delay(800); // Reduced wait time
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterCurrent();
    // Efficient delay for layout stabilization
    const platformDelay = device.getPlatform() === 'android' ? 2000 : 1500;
    await TestHelpers.delay(platformDelay);

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
    // Wait for network filter to apply - reduced delay
    const platformDelay = device.getPlatform() === 'android' ? 3000 : 2000;
    await TestHelpers.delay(platformDelay);

    // Use efficient stability method
    await WalletView.waitForTokenToBeStableAndVisible('AVAX');

    const avax = WalletView.tokenInWallet('AVAX');
    await Assertions.expectElementToBeVisible(avax);
    await WalletView.tapOnTokenWithRetry('AVAX');
    await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
    await TokenOverview.tapSendButton();
    await Assertions.checkIfVisible(NetworkEducationModal.container);
    await Assertions.checkIfElementToHaveText(
      NetworkEducationModal.networkName,
      AVAX_NETWORK_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
    // Reduced wait for navigation to complete
    await TestHelpers.delay(2000);
  });

  it('should switch networks when clicking on swap if an asset on a different network is selected', async () => {
    // Ensure we're in a clean state before starting - cancel any open send flow
    try {
      await SendView.tapCancelButton();
      await TestHelpers.delay(1500); // Reduced cancel wait time
    } catch (e) {
      // If cancel button doesn't exist, we're not in send flow, which is fine
    }

    const BNB_NETWORK_NAME = 'BNB Smart Chain';
    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // Wait for network filter to apply - reduced delay
    const platformDelay = device.getPlatform() === 'android' ? 3000 : 2000;
    await TestHelpers.delay(platformDelay);

    // Use efficient stability method
    await WalletView.waitForTokenToBeStableAndVisible('BNB');

    const bnb = WalletView.tokenInWallet('BNB');
    await Assertions.expectElementToBeVisible(bnb);
    await WalletView.tapOnTokenWithRetry('BNB');
    await TokenOverview.tapSwapButton();
    await Assertions.expectElementToBeVisible(NetworkEducationModal.container);
    await Assertions.expectElementToHaveText(
      NetworkEducationModal.networkName,
      BNB_NETWORK_NAME,
    );
    await NetworkEducationModal.tapGotItButton();
    await QuoteView.tapOnCancelButton();
    // Reduced wait for navigation to complete
    await TestHelpers.delay(2000);
  });

  it('should allows clicking into the asset details page of native token on another network', async () => {
    // Ensure we're back in wallet view and UI is stable
    try {
      await TokenOverview.tapBackButton();
      await TestHelpers.delay(1500); // Reduced back navigation wait time
    } catch (e) {
      // If back button doesn't exist, we might already be in wallet view
    }

    await WalletView.tapTokenNetworkFilter();
    await WalletView.tapTokenNetworkFilterAll();
    // Wait for network filter to apply - reduced delay
    const platformDelay = device.getPlatform() === 'android' ? 2000 : 1500;
    await TestHelpers.delay(platformDelay);

    // Use the efficient tapping method
    await WalletView.tapOnTokenWithRetry('AVAX');

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
