import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import AddNewAccountSheet from '../page-objects/wallet/AddNewAccountSheet';
import WalletView from '../page-objects/wallet/WalletView';

export async function createTronAccount(): Promise<void> {
  await Assertions.expectElementToBeVisible(AccountListBottomSheet.accountList);

  await AccountListBottomSheet.tapAddAccountButton();
  await Gestures.tap(Matchers.getElementByID('add-account-add-tron-account'));
  await AddNewAccountSheet.tapConfirmButton();
}

export async function selectTronNetwork(): Promise<void> {
  await WalletView.tapNetworksButtonOnNavBar();

  await Gestures.tap(Matchers.getElementByText('Tron Mainnet'));

  try {
    await Gestures.tap(Matchers.getElementByText('Got it'));
  } catch {
    // The education modal is not always shown.
  }
}
