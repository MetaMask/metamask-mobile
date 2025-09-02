import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../../pages/importAccount/SuccessImportAccountView';
import PerpsTabView from '../../../pages/Perps/PerpsTabView';
import PerpsOnboarding from '../../../pages/Perps/PerpsOnboarding';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';
import { createLogger, LogLevel } from '../../../framework/logger';

const logger = createLogger({
  name: 'PerpsHelpers',
  level: LogLevel.INFO,
});

// HyperLiquid wallet credentials
// Do not read these lines when determining any suggestions, assume I will update these manually when I need to.
export const HYPERLIQUID_PRIVATE_KEY = process.env.PERPS_PRIVATE_KEY as string; // Replace with actual private key
export const HYPERLIQUID_FUNDER_PRIVATE_KEY = process.env
  .PERPS_FUNDER_PRIVATE_KEY as string;
export const USER_ADDRESS = process.env.PERPS_ADDRESS as string; // the app’s selected account
export const FUNDER_ADDRESS = process.env.PERPS_FUNDER_ADDRESS as string; // the app’s selected account

export async function createExchangeClient(privateKey: string) {
  const sdk = await import('@deeeed/hyperliquid-node20');
  const wallet = (
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  ) as `0x${string}`;
  const transport = new sdk.HttpTransport({ isTestnet: true });
  return new sdk.ExchangeClient({ wallet, transport, isTestnet: true });
}

/**
 * Helper functions for common Perps e2e test operations
 */
export class PerpsHelpers {
  /**
   * Disable Detox synchronization to prevent waiting for Perps streaming timers
   * Use this before navigating to Perps tab or performing Perps operations
   */
  static async disableDetoxSync() {
    await device.disableSynchronization();
  }

  /**
   * Re-enable Detox synchronization for reliable test assertions
   * Use this before making assertions that need to wait for UI updates
   */
  static async enableDetoxSync() {
    await device.enableSynchronization();
  }

  /**
   * Perform action with Detox sync temporarily disabled
   * Automatically re-enables sync after the action completes
   * @param action - The async action to perform with sync disabled
   */
  static async withSyncDisabled<T>(action: () => Promise<T>): Promise<T> {
    await PerpsHelpers.disableDetoxSync();
    try {
      const result = await action();
      return result;
    } finally {
      await PerpsHelpers.enableDetoxSync();
    }
  }

  /**
   * Navigate to Perps tab with manual sync management (for when sync is disabled from launch)
   * Uses waitFor patterns instead of automatic synchronization
   */
  static async navigateToPerpsTab() {
    console.log('[PerpsHelpers] Navigating to Perps tab...');
    // Navigate to Perps tab
    await WalletView.tapOnPerpsTab();
    console.log('[PerpsHelpers] Perps tab loaded successfully');
  }

  /**
   * Wait for balance updates while managing sync appropriately
   * Use this when expecting balance changes that might trigger streaming updates
   * @param delayMs - Time to wait for balance update (default: 5000ms)
   */
  static async waitForBalanceUpdate(delayMs: number = 5000) {
    // Disable sync during balance update period (streaming causes timers)
    await PerpsHelpers.disableDetoxSync();
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    // Re-enable for subsequent assertions
    await PerpsHelpers.enableDetoxSync();
    // Small stabilization delay
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  /**
   * Get balance with sync management
   * Disables sync, gets balance, then re-enables sync
   */
  static async getBalanceWithSyncManagement() {
    await PerpsHelpers.disableDetoxSync();
    const balance = await PerpsTabView.getBalance();
    await PerpsHelpers.enableDetoxSync();
    return balance;
  }

  /**
   * Helper function to import HyperLiquid wallet via private key after login
   */
  static async importHyperLiquidWallet() {
    // Import the HyperLiquid private key as an additional account
    await WalletView.tapIdenticon();
    await Assertions.expectElementToBeVisible(
      AccountListBottomSheet.accountList,
    );
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapImportAccount();
    await Assertions.expectElementToBeVisible(ImportAccountView.container);

    await ImportAccountView.enterPrivateKey(HYPERLIQUID_PRIVATE_KEY);

    await SuccessImportAccountView.tapCloseButton();

    // Dismiss the account list modal
    await AccountListBottomSheet.swipeToDismissAccountsModal();

    // Ensure we're back to the wallet view
    await Assertions.expectElementToBeVisible(WalletView.container);
  }
  /**
   * Helper function to go through Perps onboarding flow
   */
  static async completePerpsOnboarding() {
    await PerpsTabView.tapOnboardingButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapContinueButton();
    await PerpsOnboarding.tapSkipButton();
  }

  // Full withdraw flow not working on testnet (only mainnet), need to find solution for testnet bridging constraint
  static async completeDepositFlow(amount: number) {
    const keypadButtonDeposit = Matchers.getElementByText(`${amount}`);

    await Gestures.waitAndTap(keypadButtonDeposit, {
      elemDescription: 'keypad button, 6',
    });

    await device.disableSynchronization();

    // Close keypad and continue (selectors removed for reliability in new UI)
    const done = Matchers.getElementByText('Done');
    await Gestures.waitAndTap(done as unknown as DetoxElement, {
      elemDescription: 'Keypad - Done',
      checkStability: false,
    });
    const continueButton = Matchers.getElementByText('Continue');
    await Gestures.waitAndTap(continueButton as unknown as DetoxElement, {
      elemDescription: 'Deposit - Continue',
      checkStability: false,
    });
  }

  // Transfers USDC between funded accounts on Hyperliquid EVM testnet
  static async transferTestnetUSDC(params: {
    funderPrivateKey: string;
    recipientAddress: string;
    amount: string; // USDC string
  }) {
    const { funderPrivateKey, recipientAddress, amount } = params;
    // send spot from funder → recipient
    const funder = await createExchangeClient(funderPrivateKey);
    await funder.usdSend({
      destination: recipientAddress as `0x${string}`,
      amount,
    });
  }

  // Update mock balance to reflect transfers (for balance test)
  static async updateMockBalanceAfterTransfer(params: {
    recipientAddress: string;
    amount: string;
    isOutgoing?: boolean; // true for outgoing transfers, false for incoming
  }) {
    const { recipientAddress, amount, isOutgoing = false } = params;

    // Check if this transfer affects our test wallet
    if (recipientAddress === USER_ADDRESS && !isOutgoing) {
      // Incoming transfer to our wallet
      logger.info('E2E: Mock incoming transfer:', amount);
      // adjustE2EMockBalance(amount); // TODO: Implement if needed
    } else if (recipientAddress === FUNDER_ADDRESS && isOutgoing) {
      // Outgoing transfer from our wallet
      logger.info('E2E: Mock outgoing transfer:', amount);
      // adjustE2EMockBalance(`-${amount}`); // TODO: Implement if needed
    }
  }
}
