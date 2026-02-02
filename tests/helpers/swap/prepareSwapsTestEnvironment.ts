import TabBarComponent from '../../../e2e/pages/wallet/TabBarComponent.ts';
import SettingsView from '../../../e2e/pages/Settings/SettingsView.ts';
import AdvancedSettingsView from '../../../e2e/pages/Settings/AdvancedView.ts';

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
