import TestHelpers from '../../../helpers';
import BrowserView from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../../../pages/Browser/ConnectedAccountsModal';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { SOLANA_TEST_TIMEOUTS } from '../../../selectors/Browser/SolanaTestDapp.selectors';
import Assertions from '../../../utils/Assertions';

export const account1Short = 'CEQ8...Yrrd';
export const account2Short = '9Wa2...Dj2U';

/**
 * Connects the Solana test dapp to the wallet.
 *
 * @param options.selectAllAccounts - Whether we connect with all accounts or only the default one
 */
export const connectSolanaTestDapp = async (
  options: { selectAllAccounts?: boolean } = {},
): Promise<void> => {
  const { selectAllAccounts } = options;

  const header = SolanaTestDApp.getHeader();
  await header.connect();
  await header.selectMetaMask();

  if (selectAllAccounts) {
    await ConnectedAccountsModal.tapAccountListBottomSheet();
    await ConnectBottomSheet.tapSelectAllButton();
    await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
  }

  // Click connect button
  await TestHelpers.delay(SOLANA_TEST_TIMEOUTS.CONNECTION);
  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToSolanaTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapBrowser();
  await Assertions.checkIfVisible(BrowserView.browserScreenID);
  await SolanaTestDApp.navigateToSolanaTestDApp();
};

export const assertIsSignedTransaction = async (signedTransaction: string) => {
  if (!/^.{88}$/.test(signedTransaction)) {
    throw new Error(
      `Signed transaction does not match regex: ${signedTransaction}`,
    );
  }
};
