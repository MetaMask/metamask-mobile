import BrowserView from '../../../pages/Browser/BrowserView';
import ConnectBottomSheet from '../../../pages/Browser/ConnectBottomSheet';
import SolanaTestDApp from '../../../pages/Browser/SolanaTestDApp';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../utils/Assertions';

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

export const navigateToSolanaTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapBrowser();
  await Assertions.checkIfVisible(BrowserView.browserScreenID);
  await SolanaTestDApp.navigateToSolanaTestDApp();
};
