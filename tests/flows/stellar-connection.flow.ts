import { AccountListBottomSheetSelectorsIDs } from '../../../app/components/Views/AccountSelector/AccountListBottomSheet.testIds';
import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import StellarTestDapp from '../page-objects/Browser/StellarTestDapp';
import Assertions from '../framework/Assertions';
import Matchers from '../framework/Matchers';
import Utilities from '../framework/Utilities';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import { navigateToBrowserView } from './browser.flow';

export const account1Short = 'GDEM2...YE6K';

// Soroban auth-entry preimage XDR for Stellar testnet (Test SDF Network ; September 2015).
export const exampleAuthEntryXdr =
  'AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyAAAAAAdbzRUAD0JAAAAAAAAAAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAh0cmFuc2ZlcgAAAAAAAAAA';

/**
 * Stellar snap accounts are created on demand during the dapp connect flow
 * (same pattern as other multichain wallet-standard tests). The MetaMask connect
 * sheet only shows the Connect button once a Stellar account exists.
 */
const ensureStellarAccountInConnectSheet = async (): Promise<void> => {
  const connectReady = await Utilities.isElementVisible(
    ConnectBottomSheet.connectButton,
    5000,
  );
  if (connectReady) {
    return;
  }

  await ConnectBottomSheet.tapImportAccountOrHWButton();
  await AccountListBottomSheet.tapAddAccountButtonV2({ shouldWait: true });
  await Utilities.executeWithRetry(
    async () => {
      const button = Matchers.getElementByID(
        AccountListBottomSheetSelectorsIDs.CREATE_ACCOUNT,
        0,
      );
      await Assertions.expectElementToHaveText(button, 'Add account', {
        timeout: 5000,
      });
    },
    {
      timeout: 90_000,
      interval: 2_000,
      description: 'Wait for Stellar account creation in connect flow',
    },
  );

  await AccountListBottomSheet.tapBackButton();
  await Assertions.expectElementToBeVisible(ConnectBottomSheet.container, {
    description: 'Connect sheet should be visible after Stellar account setup',
    timeout: 15_000,
  });
  await ConnectBottomSheet.scrollToBottomOfModal();
};

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

  await ensureStellarAccountInConnectSheet();

  if (selectAllAccounts) {
    await ConnectedAccountsModal.tapAccountListBottomSheet();
    await ConnectBottomSheet.tapSelectAllButton();
    await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
  }

  if (assert) {
    await assert();
  }

  await Assertions.expectElementToBeVisible(ConnectBottomSheet.connectButton, {
    description: 'Connect button should be visible before tapping',
    timeout: 15_000,
  });
  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToStellarTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapHome();
  await navigateToBrowserView();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await StellarTestDapp.navigateToStellarTestDApp();
};
