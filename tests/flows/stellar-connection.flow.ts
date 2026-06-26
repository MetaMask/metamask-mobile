import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import StellarTestDapp from '../page-objects/Browser/StellarTestDapp';
import Assertions from '../framework/Assertions';
import Utilities from '../framework/Utilities';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import { navigateToBrowserView } from './browser.flow';

export const account1Short = 'GDEM2...YE6K';

// Soroban auth-entry preimage XDR for Stellar testnet (Test SDF Network ; September 2015).
export const exampleAuthEntryXdr =
  'AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyAAAAAAdbzRUAD0JAAAAAAAAAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAh0cmFuc2ZlcgAAAAAAAAAA';

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
      await Assertions.expectElementToBeVisible(
        ConnectBottomSheet.connectButton,
        {
          description: 'Connect button should be visible before tapping',
          timeout: 5000,
        },
      );
    },
    {
      timeout: 60_000,
      interval: 2_000,
      description: 'Wait for Stellar connect sheet to be ready',
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
