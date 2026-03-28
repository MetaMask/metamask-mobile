import { loginToApp } from './wallet.flow';
import Assertions from '../framework/utils/Assertions';
import Gestures from '../framework/utils/Gestures';
import Matchers from '../framework/utils/Matchers';
import WalletView from '../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../page-objects/AccountListBottomSheet';

/**
 * Login and create a Tron account via the account selector.
 */
export async function createTronAccount(): Promise<void> {
  await loginToApp();

  await WalletView.tapIdenticon();
  const accountList = Matchers.getElementByID(
    AccountListBottomSheet.accountList,
  );
  await Assertions.expectElementToBeVisible(accountList);

  await AccountListBottomSheet.tapAddAccountButton();
  const addTronButton = Matchers.getElementByID('add-account-add-tron-account');
  await Gestures.tap(addTronButton);
}

/**
 * Select the Tron network from the network selector.
 */
export async function selectTronNetwork(): Promise<void> {
  await WalletView.tapNetworksButtonOnNavBar();

  const tronNetwork = Matchers.getElementByText('Tron Mainnet');
  await Gestures.tap(tronNetwork);

  try {
    const gotItButton = Matchers.getElementByText('Got it');
    await Gestures.tap(gotItButton);
  } catch {
    // The education modal is not always shown.
  }
}
