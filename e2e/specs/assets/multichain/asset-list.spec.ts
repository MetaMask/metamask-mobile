import { RegressionAssets } from '../../../tags';
import WalletView from '../../../pages/wallet/WalletView';
import FixtureBuilder from '../../../../tests/framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../../viewHelper';
import Assertions from '../../../../tests/framework/Assertions';
import TokenOverview from '../../../pages/wallet/TokenOverview';
import NetworkManager from '../../../pages/wallet/NetworkManager';
import { setupRemoteFeatureFlagsMock } from '../../../../tests/api-mocking/helpers/remoteFeatureFlagsHelper';
import {
  remoteFeatureFlagTronAccounts,
  remoteFeatureMultichainAccountsAccountDetailsV2,
} from '../../../../tests/api-mocking/mock-responses/feature-flags-mocks';

const ETHEREUM_NAME = 'Ethereum';
const AVAX_NAME = 'AVAX';
const BNB_NAME = 'BNB';

describe(RegressionAssets('Asset list - '), () => {
  it('displays tokens across networks when all popular networks are selected', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapPopularNetworksTab();
        await NetworkManager.tapSelectAllPopularNetworks();
        await NetworkManager.closeNetworkManager();
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

  it('shows only Ethereum tokens when selecting Ethereum network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapNetwork('eip155:1');
        await NetworkManager.closeNetworkManager();
        const eth = WalletView.tokenInWallet(ETHEREUM_NAME);
        const avax = WalletView.tokenInWallet(AVAX_NAME);
        const bnb = WalletView.tokenInWallet(BNB_NAME);
        await Assertions.expectElementToBeVisible(eth);
        await Assertions.expectElementToNotBeVisible(avax);
        await Assertions.expectElementToNotBeVisible(bnb);
      },
    );
  });

  it('opens asset details for a native token on another network', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withPopularNetworks().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapPopularNetworksTab();
        await NetworkManager.tapSelectAllPopularNetworks();
        await NetworkManager.closeNetworkManager();
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
  it('opens asset details for a TRON token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureFlagTronAccounts(true),
            ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnToken('Tron');
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

        await TokenOverview.scrollOnScreen();
        await Assertions.expectElementToBeVisible(TokenOverview.receiveButton);
        await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
      },
    );
  });
  it('opens asset details for a SOL token', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(mockServer, {
            ...remoteFeatureMultichainAccountsAccountDetailsV2(true),
          });
        },
      },
      async () => {
        await loginToApp();
        await WalletView.tapOnToken('Solana');
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

        await TokenOverview.scrollOnScreen();
        await Assertions.expectElementToBeVisible(TokenOverview.receiveButton);
        await Assertions.expectElementToBeVisible(TokenOverview.sendButton);
      },
    );
  });
});
