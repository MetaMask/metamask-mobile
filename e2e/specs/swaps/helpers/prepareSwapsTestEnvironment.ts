import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import Assertions from '../../../framework/Assertions';

const ACCOUNT_1 = 'Account 1';
const ACCOUNT_2 = 'Account 2';

/**
 * Prepares the swaps test environment by disabling Smart Transactions (stx).
 * Throws a descriptive error if any step fails.
 *
 * @throws {Error} If disabling stx fails
 */
export async function prepareSwapsTestEnvironment(): Promise<void> {
  await WalletView.tapIdenticon();
  await AccountListBottomSheet.tapAddAccountButton();
  await AddAccountBottomSheet.tapCreateEthereumAccount();
  await Assertions.expectTextDisplayed(ACCOUNT_1);
  await Assertions.expectTextDisplayed(ACCOUNT_2);
  await AccountListBottomSheet.swipeToDismissAccountsModal();
}
