import { loginToApp } from '../../viewHelper';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { SmokePerps } from '../../tags';
import Assertions from '../../framework/Assertions';
import WalletView from '../../pages/wallet/WalletView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import PerpsTabView from '../../pages/Perps/PerpsTabView';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import {
  HYPERLIQUID_FUNDER_PRIVATE_KEY,
  HYPERLIQUID_PRIVATE_KEY,
  FUNDER_ADDRESS,
  USER_ADDRESS,
  PerpsHelpers,
} from './helpers/perps-helpers';

describe(SmokePerps('HyperLiquid USDC Balance'), () => {
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
      },
      async () => {
        // Login to the existing wallet
        await loginToApp();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Import the HyperLiquid private key as an additional account
        await PerpsHelpers.importHyperLiquidWallet();

        // Navigate back to wallet and then to Perps tab
        await TabBarComponent.tapWallet();
        // Navigate to Perps tab
        await WalletView.tapOnPerpsTab();

        await Assertions.expectTextDisplayed('Hyperliquid USDC balance');

        // extract balance value from the UI
        const balance = await PerpsTabView.getBalance();

        await PerpsHelpers.transferTestnetUSDC({
          funderPrivateKey: HYPERLIQUID_FUNDER_PRIVATE_KEY,
          recipientAddress: USER_ADDRESS,
          amount: '1',
        });

        // Expect balance two to be greater than balance one

        await TestHelpers.delay(2000);

        const balance2 = await PerpsTabView.getBalance();
        if (balance2 <= balance) {
          throw new Error(
            `Expected balance after seeding (${balance2}) to be greater than initial balance (${balance})`,
          );
        }

        await PerpsHelpers.transferTestnetUSDC({
          funderPrivateKey: HYPERLIQUID_PRIVATE_KEY,
          recipientAddress: FUNDER_ADDRESS,
          amount: '1',
        });

        await TestHelpers.delay(2000);

        const balance3 = await PerpsTabView.getBalance();
        if (balance2 <= balance3) {
          throw new Error(
            `Expected balance after seeding (${balance3}) to be less than initial balance (${balance2})`,
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
