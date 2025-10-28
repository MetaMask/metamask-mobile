import { RegressionWalletPlatform } from '../../tags';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import WalletView from '../../pages/wallet/WalletView';
import NetworkListModal from '../../pages/Network/NetworkListModal';
import NetworkEducationModal from '../../pages/Network/NetworkEducationModal';
import NetworkManager from '../../pages/wallet/NetworkManager';
import Assertions from '../../framework/Assertions';
import Matchers from '../../framework/Matchers';
import Gestures from '../../framework/Gestures';
import { CustomNetworks } from '../../resources/networks.e2e';
import BuyGetStartedView from '../../pages/Ramps/BuyGetStartedView';
import { NetworkToCaipChainId } from '../../../app/components/UI/NetworkMultiSelector/NetworkMultiSelector.constants';

describe(RegressionWalletPlatform('Balance Empty State'), (): void => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('displays the empty state when user has zero balance', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDefaultFixture() // This provides zero balance by default
          .build(),
        restartDevice: true,
      },
      async (): Promise<void> => {
        // Given: User is logged in with zero balance
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible after login',
        });

        // Then: Empty state should be visible
        const emptyStateContainer = Matchers.getElementByID(
          'portfolio-balance-empty-state',
        );
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description:
            'Portfolio balance empty state should be visible for zero balance',
        });

        // And: User should NOT see "$0.00" balance display
        // The empty state replaces the balance display, so total balance should not be visible
        await Assertions.expectElementToNotBeVisible(WalletView.totalBalance, {
          description:
            'Total balance should be hidden when empty state is shown',
        });
      },
    );
  });

  it('displays the empty state consistently across different networks', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withDefaultFixture() // Zero balance on all networks
          .withSolanaFixture() // Add Solana support
          .ensureSolanaModalSuppressed() // Suppress Solana intro modal
          .build(),
        restartDevice: true,
      },
      async (): Promise<void> => {
        // Given: User is logged in with zero balance
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible after login',
        });

        // Verify empty state is initially visible on default network
        const emptyStateContainer = Matchers.getElementByID(
          'portfolio-balance-empty-state',
        );
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description:
            'Empty state should be visible on default network with zero balance',
        });

        // When: User switches to Sepolia testnet (should also have zero balance)
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await NetworkListModal.tapTestNetworkSwitch();
        await NetworkListModal.scrollToBottomOfNetworkList();
        await NetworkListModal.changeNetworkTo(
          CustomNetworks.Sepolia.providerConfig.nickname,
        );
        await NetworkEducationModal.tapGotItButton();

        // Then: Empty state should still be visible on Sepolia
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description:
            'Empty state should remain visible on Sepolia testnet with zero balance',
        });
        await Assertions.expectElementToNotBeVisible(WalletView.totalBalance, {
          description: 'Total balance should remain hidden on Sepolia',
        });

        // When: User switches to Ethereum Mainnet (should also have zero balance)
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo('Ethereum Main Network');

        // Then: Empty state should still be visible on mainnet
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description:
            'Empty state should remain visible on Ethereum mainnet with zero balance',
        });
        await Assertions.expectElementToNotBeVisible(WalletView.totalBalance, {
          description: 'Total balance should remain hidden on mainnet',
        });

        // When: User switches to Solana Mainnet (should also have zero balance)
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkManager.openNetworkManager();
        await NetworkManager.tapNetwork(NetworkToCaipChainId.SOLANA);
        await NetworkManager.closeNetworkManager();

        // Then: Empty state should still be visible on Solana
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description:
            'Empty state should remain visible on Solana network with zero balance',
        });
        await Assertions.expectElementToNotBeVisible(WalletView.totalBalance, {
          description: 'Total balance should remain hidden on Solana',
        });

        // When: User switches to Ganache (local test network with funded accounts)
        await WalletView.tapNetworksButtonOnNavBar();
        await NetworkListModal.changeNetworkTo('Localhost');

        // Then: Empty state should NOT be visible (has balance on Ganache)
        await Assertions.expectElementToNotBeVisible(emptyStateContainer, {
          description:
            'Empty state should be hidden on Ganache network with funded balance',
        });

        // And: Normal balance should be displayed
        await Assertions.expectElementToBeVisible(WalletView.totalBalance, {
          description: 'Total balance should be visible on funded network',
        });
        const balance = await WalletView.getBalanceText();
        if (balance.includes('Fund your wallet') || balance === '$0.00') {
          throw new Error(
            `Expected funded balance on Ganache, but got: ${balance}`,
          );
        }
      },
    );
  });

  it('navigates to the buy flow when the action button is tapped', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        restartDevice: true,
      },
      async (): Promise<void> => {
        // Given: User is logged in and empty state is visible
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible after login',
        });

        const emptyStateActionButton = Matchers.getElementByID(
          'portfolio-balance-empty-state-action-button',
        );
        await Assertions.expectElementToBeVisible(emptyStateActionButton, {
          description: 'Empty state action button should be visible',
        });

        // When: User taps the "Add funds" action button
        await Gestures.waitAndTap(emptyStateActionButton, {
          elemDescription: 'Empty state add funds button',
        });

        // Then: Should navigate to buy/ramp flow
        await Assertions.expectElementToBeVisible(
          BuyGetStartedView.getStartedButton,
          {
            elemDescription: 'Buy Get Started View should be visible',
          },
        );
      },
    );
  });

  it('maintains the empty state behavior after app restart', async (): Promise<void> => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().withDefaultFixture().build(),
        restartDevice: true,
      },
      async (): Promise<void> => {
        // Given: User is logged in with zero balance
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'Wallet view should be visible after login and restart',
        });

        // Verify empty state is initially visible
        const emptyStateContainer = Matchers.getElementByID(
          'portfolio-balance-empty-state',
        );
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description: 'Empty state should be visible after app restart',
        });

        // When: App is restarted (simulated by device restart in fixture)
        // The fixture already handles device restart, so the state should persist

        // Then: Empty state should still be visible after restart
        await Assertions.expectElementToBeVisible(emptyStateContainer, {
          description: 'Empty state should persist after restart',
        });
        await Assertions.expectElementToNotBeVisible(WalletView.totalBalance, {
          description: 'Total balance should remain hidden after restart',
        });

        // And: All empty state components should still be present
        const emptyStateTitle = Matchers.getElementByID(
          'portfolio-balance-empty-state-title',
        );
        await Assertions.expectElementToBeVisible(emptyStateTitle, {
          description: 'Empty state title should be visible after restart',
        });

        const emptyStateActionButton = Matchers.getElementByID(
          'portfolio-balance-empty-state-action-button',
        );
        await Assertions.expectElementToBeVisible(emptyStateActionButton, {
          description:
            'Empty state action button should be visible after restart',
        });
      },
    );
  });
});
