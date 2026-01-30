import BrowserView from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import TronTestDApp from '../../../pages/Browser/TronTestDApp';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../../tests/framework/Assertions';

export const account1Short = 'TLSL...nf2T';
export const account2Short = '9Wa2...Dj2U';

export const EXPECTED_SIGNED_MESSAGE =
  '0x40ed224cd55c372e99bf3796707ac785e8c8813d12d1f36f42b906571089813b5de43942fe4cd798265724900402b2df0390c0a763770c6cd700f0446625c0e01b';

/**
 * Connects the Tron test dapp to the wallet.
 *
 * @param options.selectAllAccounts - Whether we connect with all accounts or only the default one
 */
export const connectTronTestDapp = async (
  options: {
    selectAllAccounts?: boolean;
    assert?: () => Promise<void>;
  } = {},
): Promise<void> => {
  const { selectAllAccounts, assert } = options;

  const header = TronTestDApp.getHeader();
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

export const navigateToTronTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapBrowser();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await TronTestDApp.navigateToTronTestDApp();
};

export const assertIsSignedTransaction = async (signedTransaction: string) => {
  if (!/^.{88}$/.test(signedTransaction)) {
    throw new Error(
      `Signed transaction does not match regex: ${signedTransaction}`,
    );
  }
};
