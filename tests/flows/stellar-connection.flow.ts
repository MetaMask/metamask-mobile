import BrowserView from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import ConnectedAccountsModal from '../page-objects/Browser/ConnectedAccountsModal';
import StellarTestDapp from '../page-objects/Browser/StellarTestDapp';
import Assertions from '../framework/Assertions';
import Utilities, { sleep } from '../framework/Utilities';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import { navigateToBrowserView } from './browser.flow';

/**
 * Truncated address for SLIP-0010 m/44'/148'/0' from the default E2E mnemonic
 * (`drive manage close raven ...`).
 */
export const account1Short = 'GDWAL...LDGL';

/**
 * Post-login MultichainAccountService alignment creates the Stellar snap account
 * asynchronously (create timeout up to 30s). Without that account,
 * wallet_createSession for stellar:pubnet returns 5100 and ConnectBottomSheet
 * never mounts — unlike Solana which has a create-account prompt.
 */
export const waitForStellarAccountAlignment = async (): Promise<void> => {
  await sleep(40_000);
};

/**
 * Connects the Stellar test dapp to the wallet.
 *
 * Retries connect with a dapp reload so late login-time account alignment can
 * finish before createSession succeeds.
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

  await Utilities.executeWithRetry(
    async () => {
      await StellarTestDapp.reloadStellarTestDApp();

      const header = StellarTestDapp.getHeader();
      await header.connect();
      await header.selectMetaMask();

      await Assertions.expectElementToBeVisible(ConnectBottomSheet.container, {
        description: 'Connect sheet should be visible',
        timeout: 12_000,
      });
    },
    {
      timeout: 180_000,
      interval: 8_000,
      description: 'Wait for Stellar connect sheet after account alignment',
    },
  );

  if (selectAllAccounts) {
    await ConnectedAccountsModal.tapAccountListBottomSheet();
    await ConnectBottomSheet.tapSelectAllButton();
    await ConnectBottomSheet.tapAccountConnectMultiSelectButton();
  }

  if (assert) {
    await assert();
  }

  await Utilities.waitForElementToBeEnabled(
    ConnectBottomSheet.connectButton,
    10_000,
    500,
  );
  await ConnectBottomSheet.tapConnectButton();
};

export const navigateToStellarTestDApp = async (): Promise<void> => {
  await TabBarComponent.tapHome();
  await navigateToBrowserView();
  await Assertions.expectElementToBeVisible(BrowserView.browserScreenID);
  await StellarTestDapp.navigateToStellarTestDApp();
};
