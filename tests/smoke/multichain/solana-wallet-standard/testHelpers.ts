import BrowserView from '../../../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../page-objects/Browser/ConnectedAccountsModal';
import SolanaTestDApp from '../../../page-objects/Browser/SolanaTestDApp';
import Assertions from '../../../framework/Assertions';
import { navigateToBrowserView } from '../../../page-objects/viewHelper.ts';

export const account1Short = 'CEQ8...Yrrd';
export const account2Short = '9Wa2...Dj2U';

/**
 * Connects the Solana test dapp to the wallet.
 *
 * @param options.selectAllAccounts - Whether we connect with all accounts or only the default one
 */
export const connectSolanaTestDapp = async (
  options: {
    selectAllAccounts?: boolean;
    assert?: () => Promise<void>;
  } = {},
): Promise<void> => {
  const { selectAllAccounts, assert } = options;

  const header = SolanaTestDApp.getHeader();
  await header.connect();
  await header.selectMetaMask();

  if (selectAllAccounts) {
    await ConnectedAccountsModal.tapAccountListBottomSheet();
    await ConnectBottomSheet.tapSelectAllButton();
    await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
  }

  if (assert) {
    await assert();
  }

  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToSolanaTestDApp = async (): Promise<void> => {
  await navigateToBrowserView();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await SolanaTestDApp.navigateToSolanaTestDApp();
};

export const assertIsSignedTransaction = async (signedTransaction: string) => {
  if (!/^.{88}$/.test(signedTransaction)) {
    throw new Error(
      `Signed transaction does not match regex: ${signedTransaction}`,
    );
  }
};
