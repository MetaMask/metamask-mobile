import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import {
  FUNDER_ADDRESS,
  HYPERLIQUID_FUNDER_PRIVATE_KEY,
  HYPERLIQUID_PRIVATE_KEY,
  PerpsHelpers,
  USER_ADDRESS,
} from './helpers/perps-helpers';
import { PERPS_ARBITRUM_MOCKS } from '../../api-mocking/mock-responses/perps-arbitrum-mocks';

describe(SmokePerps('HyperLiquid USDC Balance'), () => {
  // Use mocks to prevent timer blocking, but update mock balance to reflect real transfers
  beforeAll(() => {
    process.env.DISABLE_PERPS_STREAMING = 'true';
  });

  afterAll(() => {
    // Clean up environment variables
    delete process.env.DISABLE_PERPS_STREAMING;
  });

  it('should navigate to Perps tab and display HyperLiquid balance section, and update in real time as Perps balance changes', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withPopularNetworks()
          .withNetworkController({
            providerConfig: {
              type: 'rpc',
              chainId: '0xa4b1',
              rpcUrl: 'https://arb1.arbitrum.io/rpc',
              nickname: 'Arbitrum One',
              ticker: 'ETH',
            },
          })
          .ensureSolanaModalSuppressed()
          .build(),
        restartDevice: true,
        testSpecificMock: PERPS_ARBITRUM_MOCKS,
      },
      async () => {
        // Login to the existing wallet
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Import the HyperLiquid private key as an additional account
        await PerpsHelpers.importHyperLiquidWallet();

        // Navigate back to wallet and then to Perps tab
        await TabBarComponent.tapWallet();

        // Navigate to Perps tab with comprehensive sync management (prevents timer blocking)
        await PerpsHelpers.navigateToPerpsTab();

        // Assert that Perps tab is loaded and displaying balance
        await Assertions.expectTextDisplayed('Perp account balance');

        // Example of balance testing with proper sync management (currently commented out)
        // Uncomment and modify these when ready to test balance updates:

        // Set initial mock balance to a realistic starting amount
        const { updateE2EMockBalance } = await import(
          '../../../app/components/UI/Perps/utils/e2eUtils'
        );
        updateE2EMockBalance('10.00'); // Start with $10 balance
        // Get initial balance (now uses mock data)
        const balance = await PerpsHelpers.getBalanceWithSyncManagement();

        // Transfer USDC (external operation) and update mock to reflect it
        await PerpsHelpers.transferTestnetUSDC({
          funderPrivateKey: HYPERLIQUID_FUNDER_PRIVATE_KEY,
          recipientAddress: USER_ADDRESS,
          amount: '1',
        });

        // Update mock balance to reflect the incoming transfer
        await PerpsHelpers.updateMockBalanceAfterTransfer({
          recipientAddress: USER_ADDRESS,
          amount: '1',
          isOutgoing: false,
        });

        // Wait for UI to update
        await PerpsHelpers.waitForBalanceUpdate();

        // Get updated balance
        const balance2 = await PerpsHelpers.getBalanceWithSyncManagement();
        if (balance2 <= balance) {
          throw new Error(
            `Expected balance after deposit (${balance2}) to be greater than initial balance (${balance})`,
          );
        }

        // Transfer USDC out (our wallet → funder)
        await PerpsHelpers.transferTestnetUSDC({
          funderPrivateKey: HYPERLIQUID_PRIVATE_KEY,
          recipientAddress: FUNDER_ADDRESS,
          amount: '1',
        });

        // Update mock balance to reflect the outgoing transfer
        await PerpsHelpers.updateMockBalanceAfterTransfer({
          recipientAddress: FUNDER_ADDRESS,
          amount: '1',
          isOutgoing: true,
        });

        // Wait for UI to update
        await PerpsHelpers.waitForBalanceUpdate();

        // Get updated balance
        const balance3 = await PerpsHelpers.getBalanceWithSyncManagement();
        if (balance3 >= balance2) {
          throw new Error(
            `Expected balance after withdrawal (${balance3}) to be less than balance before withdrawal (${balance2})`,
          );
        }
      },
    );
  });

  // Full withdraw flow not working on testnet (only mainnet), need to find solution for testnet bridging constraint
  // TODO: Find solution for testnet bridging constraint. Skipping for now
  it.skip('should have full deposit and withraw functionality e2e', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
      },
      async () => {
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Import the HyperLiquid private key as an additional account
        await PerpsHelpers.importHyperLiquidWallet();

        // Navigate back to wallet and then to Perps tab
        await TabBarComponent.tapWallet();
        // Navigate to Perps tab
        await WalletView.tapOnPerpsTab();

        await PerpsHelpers.completePerpsOnboarding();

        await Assertions.expectTextDisplayed('Hyperliquid USDC balance');

        // Tap the balance button to access deposit/withdraw options
        await PerpsTabView.tapBalanceButton();

        // Decide which action to take based on balance value
        await PerpsTabView.tapAddFundsButton();

        await PerpsHelpers.completeDepositFlow(6);

        await PerpsTabView.tapBalanceButton();

        // Wait for the manage balance bottom sheet to appear
        await Assertions.expectTextDisplayed('Manage Balance');

        // Decide which action to take based on balance value
        await PerpsTabView.tapWithdrawButton();

        // Wait for the withdraw bottom sheet to appear
        await Assertions.expectTextDisplayed('Withdraw');

        await PerpsHelpers.completeWithdrawFlow(6);
      },
    );
  });
});
