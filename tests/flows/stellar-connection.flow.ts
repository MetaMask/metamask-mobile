import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import StellarTestDapp from '../page-objects/Browser/StellarTestDapp';
import Assertions from '../framework/Assertions';
import Utilities from '../framework/Utilities';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import { navigateToBrowserView } from './browser.flow';

export const account1Short = 'GDEM2...YE6K';

/**
 * Connects the Stellar test dapp to the wallet.
 *
 * @param options.selectAllAccounts - Whether we connect with all accounts or only the default one
 */
export const connectStellarTestDapp = async (
  options: {
    selectAllAccounts?: boolean;
    assert?: () => Promise<void>;
  } = {},
): Promise<void> => {
  const { selectAllAccounts, assert } = options;

  const header = StellarTestDapp.getHeader();
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

  await Utilities.executeWithRetry(
    async () => {
      await Assertions.expectElementToBeVisible(ConnectBottomSheet.container, {
        description: 'Connect sheet should be visible',
        timeout: 5000,
      });
      await Utilities.waitForElementToBeEnabled(
        ConnectBottomSheet.connectButton,
        5000,
        500,
      );
    },
    {
      timeout: 30_000,
      interval: 2_000,
      description: 'Wait for enabled Stellar connect button',
    },
  );
  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToStellarTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapHome();
  await navigateToBrowserView();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await StellarTestDapp.navigateToStellarTestDApp();
};
