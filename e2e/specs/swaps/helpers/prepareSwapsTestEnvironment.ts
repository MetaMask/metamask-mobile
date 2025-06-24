import TabBarComponent from '../../../pages/wallet/TabBarComponent.js';
import SettingsView from '../../../pages/Settings/SettingsView.js';
import AdvancedSettingsView from '../../../pages/Settings/AdvancedView.js';
import WalletView from '../../../pages/wallet/WalletView.js';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet.js';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet.js';
import ImportAccountView from '../../../pages/importAccount/ImportAccountView.js';
import SuccessImportAccountView from '../../../pages/importAccount/SuccessImportAccountView.js';
import Assertions from '../../../utils/Assertions.js';
import { ethers } from 'ethers';
import axios, { AxiosResponse } from 'axios';

// Define types for the API response
interface BridgeConfigV2 {
  chains: Record<string, { isUnifiedUIEnabled: boolean }>;
}

interface FlagItem {
  bridgeConfigV2?: BridgeConfigV2;
}

// Function to find `isUnifiedUIEnabled`
export async function isUnifiedUIEnabledForChain(chainId: string): Promise<boolean | undefined> {

  // Check if Unified UI is enabled
  const flagsUrl: string = `https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=flask&environment=dev`;
  const response: AxiosResponse<FlagItem[]> = await axios.get(flagsUrl);

  if (response.status !== 200) {
    throw new Error('Error calling UI flags API');
  }

  // Find the object that contains `bridgeConfigV2`
  const bridgeConfigV2 = response.data.find((item: FlagItem) => item.bridgeConfigV2)?.bridgeConfigV2;

  // Check if `bridgeConfigV2` exists and contains the chainId
  if (bridgeConfigV2?.chains?.[chainId]) {
    return bridgeConfigV2.chains[chainId].isUnifiedUIEnabled;
  }

  throw new Error('isUnifiedUIEnabled flag not found');
}


/**
 * Prepares the swaps test environment by disabling Smart Transactions (stx)
 * and importing a funded account for swaps.
 * Throws a descriptive error if any step fails.
 *
 * @param wallet - An object with a privateKey property for the account to import
 * @throws {Error} If disabling stx or importing the account fails
 */
export async function prepareSwapsTestEnvironment(wallet: ethers.Wallet): Promise<void> {
    try {
        // Disable Smart Transactions (stx)
        await TabBarComponent.tapSettings();
        await SettingsView.tapAdvancedTitle();
        await AdvancedSettingsView.tapSmartTransactionSwitch();
        await TabBarComponent.tapWallet();
    } catch (e) {
        throw new Error('Failed to disable Smart Transactions: ' + (e instanceof Error ? e.message : e));
    }

    try {
        // Import funded account for swaps
        await WalletView.tapIdenticon();
        await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapImportAccount();
        await Assertions.checkIfVisible(ImportAccountView.container);
        await ImportAccountView.enterPrivateKey(wallet.privateKey);
        await Assertions.checkIfVisible(SuccessImportAccountView.container);
        await SuccessImportAccountView.tapCloseButton();
        await AccountListBottomSheet.swipeToDismissAccountsModal();
        await Assertions.checkIfVisible(WalletView.container);
    } catch (e) {
        throw new Error('Failed to import account for swaps: ' + (e instanceof Error ? e.message : e));
    }
}
