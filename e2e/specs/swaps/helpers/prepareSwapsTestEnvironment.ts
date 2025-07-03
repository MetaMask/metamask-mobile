import TabBarComponent from '../../../pages/wallet/TabBarComponent.js';
import SettingsView from '../../../pages/Settings/SettingsView.js';
import AdvancedSettingsView from '../../../pages/Settings/AdvancedView.js';
import WalletView from '../../../pages/wallet/WalletView.js';

/**
 * Prepares the swaps test environment by disabling Smart Transactions (stx).
 * Throws a descriptive error if any step fails.
 *
 * @throws {Error} If disabling stx fails
 */
export async function prepareSwapsTestEnvironment(): Promise<void> {
    try {
        // Disable Smart Transactions (stx)
        await TabBarComponent.tapSettings();
        await SettingsView.tapAdvancedTitle();
        await AdvancedSettingsView.tapSmartTransactionSwitch();
        await TabBarComponent.tapWallet();
    } catch (e) {
        throw new Error('Failed to disable Smart Transactions: ' + (e instanceof Error ? e.message : e));
    }
}
