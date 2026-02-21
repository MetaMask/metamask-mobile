import BrowserView from '../../../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../../../page-objects/Browser/ConnectBottomSheet';
import TronTestDApp from '../../../page-objects/Browser/TronTestDApp';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import Assertions from '../../../../tests/framework/Assertions';

export const account1Short = 'TLSL...nf2T';

export const EXPECTED_SIGNED_MESSAGE =
  '0x40ed224cd55c372e99bf3796707ac785e8c8813d12d1f36f42b906571089813b5de43942fe4cd798265724900402b2df0390c0a763770c6cd700f0446625c0e01b';

/**
 * Connects the Tron test dapp to the wallet.
 */
export const connectTronTestDapp = async (): Promise<void> => {
  await TronTestDApp.connect();
  await TronTestDApp.selectMetaMask();

  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToTronTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapBrowser();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await TronTestDApp.navigateToTronTestDApp();
};
