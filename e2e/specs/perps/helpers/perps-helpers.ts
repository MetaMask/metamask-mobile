import Assertions from '../../../framework/Assertions';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../../pages/importAccount/SuccessImportAccountView';
import Matchers from '../../../framework/Matchers';
import Gestures from '../../../framework/Gestures';

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

    if (HYPERLIQUID_PRIVATE_KEY) {
      await ImportAccountView.enterPrivateKey(HYPERLIQUID_PRIVATE_KEY);

      await SuccessImportAccountView.tapCloseButton();

      // Dismiss the account list modal
      await AccountListBottomSheet.swipeToDismissAccountsModal();

      // Ensure we're back to the wallet view
      await Assertions.expectElementToBeVisible(WalletView.container);
    } else {
      // Just close the import screen
      await ImportAccountView.tapBackButton();
      await AccountListBottomSheet.swipeToDismissAccountsModal();
    }
  }

  // Full withdraw flow not working on testnet (only mainnet), need to find solution for testnet bridging constraint
  static async completeDepositFlow(amount: number) {
    const keypadButtonDeposit = Matchers.getElementByText(`${amount}`);

    await Gestures.waitAndTap(keypadButtonDeposit, {
      elemDescription: 'keypad button, 6',
    });

    await device.disableSynchronization();

    const doneButtonDeposit = Matchers.getElementByID('done-button');
    await Gestures.waitAndTap(doneButtonDeposit, {
      elemDescription: 'Keypad - done',
      checkStability: false,
    });

    const continueButtonDeposit = Matchers.getElementByID('continue-button');
    await Gestures.tap(continueButtonDeposit, {
      elemDescription: `Deposit - Continue Button`,
      checkStability: false,
    });
  }

  // Full withdraw flow not working on testnet (only mainnet), need to find solution for testnet bridging constraint
  static async completeWithdrawFlow(amount: number) {
    const keypadButtonWithdraw = Matchers.getElementByText(`${amount}`);

    await Gestures.waitAndTap(keypadButtonWithdraw, {
      elemDescription: 'keypad button, 6',
    });

    await device.disableSynchronization();

    const doneButtonWithdraw = Matchers.getElementByID('done-button');
    await Gestures.waitAndTap(doneButtonWithdraw, {
      elemDescription: 'Keypad - done',
      checkStability: false,
    });

    const continueButtonWithdraw = Matchers.getElementByID('continue-button');
    await Gestures.tap(continueButtonWithdraw, {
      elemDescription: `Withdraw - Continue Button`,
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
}
