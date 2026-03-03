import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import BitcoinTestDApp from '../page-objects/Browser/BitcoinTestDapp';
import Assertions from '../framework/Assertions';
import { navigateToBrowserView } from './browser.flow';

export const account1Short = 'bc1q...yump';

export const signedMessageStandard =
  '271486823211510961053671593213121630193816218985222159577512714825421410039180175314517251232893341221418210218699217951999213157247101787166209162102702122391448617217326133312849199212551951866224105551902392399522115638752383224419341608718511954214130102';

/**
 * Connects the Bitcoin test dapp to the wallet.
 *
 * @param options.selectAllAccounts - Whether we connect with all accounts or only the default one
 */
export const connectBitcoinTestDapp = async (
  options: {
    selectAllAccounts?: boolean;
    assert?: () => Promise<void>;
  } = {},
): Promise<void> => {
  const { selectAllAccounts, assert } = options;

  const header = BitcoinTestDApp.getHeader();
  await header.connect();
  await header.selectMetaMask();
  await header.selectStandard();

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

export const navigateToBitcoinTestDApp = async (): Promise<void> => {
  await navigateToBrowserView();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await BitcoinTestDApp.navigateToBitcoinTestDApp();
};

export const assertIsSignedTransaction = async (signedTransaction: string) => {
  if (!/^.{88}$/.test(signedTransaction)) {
    throw new Error(
      `Signed transaction does not match regex: ${signedTransaction}`,
    );
  }
};
