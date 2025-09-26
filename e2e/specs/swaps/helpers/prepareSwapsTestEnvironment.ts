import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import AdvancedSettingsView from '../../../pages/Settings/AdvancedView';

/**
 * Prepares the swaps test environment by disabling Smart Transactions (stx).
 * Throws a descriptive error if any step fails.
 *
 * @throws {Error} If disabling stx fails
 */
export async function prepareSwapsTestEnvironment(): Promise<void> {
  await TabBarComponent.tapSettings();
  await SettingsView.tapAdvancedTitle();
  await AdvancedSettingsView.tapResetAccountButton();
  await AdvancedSettingsView.tapConfirmResetButton();
}
