import TestHelpers from '../../../helpers';
import BrowserView from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import AddNewHdAccountComponent from '../../../pages/wallet/MultiSrp/AddAccountToSrp/AddNewHdAccountComponent';
import SolanaNewFeatureSheet from '../../../pages/wallet/SolanaNewFeatureSheet';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../utils/Assertions';
import { loginToApp } from '../../../viewHelper';

/**
 * Connects the Solana test dapp to the wallet.
 *
 * @param options
 * @param options.selectAllAccounts
 * @param options.includeDevnet
 */
export const connectSolanaTestDapp = async (
  _options: { selectAllAccounts?: boolean; includeDevnet?: boolean } = {},
): Promise<void> => {
  const header = SolanaTestDApp.getHeader();
  await header.connect();
  await header.selectMetaMask();

  // Click connect button
  await ConnectBottomSheet.tapConnectButton();
};

export const setup = async (): Promise<void> => {
  await TestHelpers.reverseServerPort();
  await loginToApp();

  // Create Solana account
  await SolanaNewFeatureSheet.tapCreateAccountButton();
  await AddNewHdAccountComponent.tapConfirm();

  // Navigate to the solana test dapp
  await TabBarComponent.tapBrowser();
  await Assertions.checkIfVisible(BrowserView.browserScreenID);
  await SolanaTestDApp.navigateToSolanaTestDApp();
};
