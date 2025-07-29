import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView.js';
import AdvancedSettingsView from '../../../pages/Settings/AdvancedView.js';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';

/**
 * Prepares the swaps test environment by disabling Smart Transactions (stx).
 * Throws a descriptive error if any step fails.
 *
 * @throws {Error} If disabling stx fails
 */
export async function prepareSwapsTestEnvironment(): Promise<void> {
  try {
    // Add a new account
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapCreateEthereumAccount();
    await AccountListBottomSheet.swipeToDismissAccountsModal();

    // Disable Smart Transactions (stx)
    await TabBarComponent.tapSettings();
    await SettingsView.tapAdvancedTitle();
    await AdvancedSettingsView.tapSmartTransactionSwitch();
    await TabBarComponent.tapWallet();
  } catch (e) {
    throw new Error(
      'Failed swap tests preparation: ' + (e instanceof Error ? e.message : e),
    );
  }
}
