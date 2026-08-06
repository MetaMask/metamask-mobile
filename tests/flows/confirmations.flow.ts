import Assertions from '../framework/Assertions';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';
import { PlatformDetector } from '../framework/PlatformLocator';
import WebView from '../framework/WebView';
import Browser from '../page-objects/Browser/BrowserView';
import FooterActions from '../page-objects/Browser/Confirmations/FooterActions';
import RowComponents from '../page-objects/Browser/Confirmations/RowComponents';
import TestDApp from '../page-objects/Browser/TestDApp';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import AccountDetails from '../page-objects/MultichainAccounts/AccountDetails';
import SmartAccount from '../page-objects/MultichainAccounts/SmartAccount';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import NetworkManager from '../page-objects/wallet/NetworkManager';
import SwitchAccountModal from '../page-objects/wallet/SwitchAccountModal';
import ActivitiesView from '../page-objects/Transactions/ActivitiesView';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletView from '../page-objects/wallet/WalletView';
import { navigateToBrowserView, waitForTestDappToLoad } from './browser.flow';
import {
  dismissPushNotificationExistingUserSheet,
  waitForWalletHomePlaywright,
} from './wallet.flow';

const LOCAL_CHAIN_NAME = 'Local RPC';
const LOCAL_CHAIN_CAIP = 'eip155:1337';
const SMART_ACCOUNT_UPGRADED_ACTIVITY = 'Smart account upgraded';
const SMART_ACCOUNT_UPGRADING_ACTIVITY = 'Upgrading smart account';

export {
  LOCAL_CHAIN_CAIP,
  SMART_ACCOUNT_UPGRADED_ACTIVITY,
  SMART_ACCOUNT_UPGRADING_ACTIVITY,
};

/**
 * Tap a test-dapp WebView button and wait for the confirmation sheet.
 */
const tapTestDappButtonAndWaitForConfirm = async (
  buttonId: string,
  description: string,
): Promise<void> => {
  const pageUrl = getDappUrl(0);
  const confirmTimeoutMs = 30_000;

  if (PlatformDetector.isAndroidAppium()) {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    const maxAttempts = 3;
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        ChromeCdpHelpers.resetMetaMaskWebViewCache();
      }
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        pageUrl,
        buttonId,
      );
      if (!clicked) {
        lastError = new Error(
          `CDP could not click #${buttonId} (${description}) on attempt ${attempt}/${maxAttempts}`,
        );
        continue;
      }
      // DOM click landed — wait the full confirm timeout (do not re-tap while
      // the sheet may still be opening).
      await FooterActions.waitForConfirmButton(confirmTimeoutMs);
      return;
    }
    throw lastError instanceof Error
      ? lastError
      : new Error(
          `CDP could not click #${buttonId} (${description}) after ${maxAttempts} attempts`,
        );
  }

  await ChromeCdpHelpers.waitForElementEnabledByIdInWebView(pageUrl, buttonId);
  await WebView.tapById(buttonId, {
    pageUrl,
    description,
  });
  await FooterActions.waitForConfirmButton(confirmTimeoutMs);
};

export const navigateToContractAndTap = async (
  contractAddress: string,
  buttonId: string,
  description: string,
): Promise<void> => {
  await navigateToBrowserView();
  await TestDApp.navigateToTestDappWithContract({
    contractAddress,
    scrollTo: buttonId,
  });
  await waitForTestDappToLoad();
  await tapTestDappButtonAndWaitForConfirm(buttonId, description);
};

export const navigateToTestDappAndTap = async (
  buttonId: string,
  description: string,
): Promise<void> => {
  await navigateToBrowserView();
  await Browser.navigateToTestDApp();
  await waitForTestDappToLoad();
  await tapTestDappButtonAndWaitForConfirm(buttonId, description);
};

export const confirmCloseAndAssertActivity = async (
  activityLabel?: string,
): Promise<void> => {
  await FooterActions.tapConfirmButton();
  // Browser can still "exist" while the confirmation sheet is open.
  await FooterActions.waitForConfirmButtonGone();
  await dismissPushNotificationExistingUserSheet();

  await Assertions.expectElementToExist(Browser.browserScreenID, {
    description: 'Browser screen after confirm',
  });
  await Browser.tapCloseBrowserButton();
  await Assertions.expectElementToBeVisible(
    TabBarComponent.tabBarWalletButton,
    {
      description: 'Wallet tab visible after leaving browser',
    },
  );
  await TabBarComponent.tapActivity();
  if (activityLabel) {
    await Assertions.expectTextDisplayed(activityLabel, {
      description: `Activity row "${activityLabel}"`,
    });
  }
  await Assertions.expectTextDisplayed('Confirmed', {
    description: 'Activity status Confirmed',
  });
};

export const switchToLocalNetworkFromNetworkManager =
  async (): Promise<void> => {
    await NetworkManager.navigateToTokensFullView();
    await NetworkManager.openNetworkManager();
    await NetworkListModal.tapOnCustomTab();
    await NetworkListModal.changeNetworkTo(LOCAL_CHAIN_NAME);
    await NetworkManager.navigateBackFromTokensFullView();
  };

/**
 * Opens Account 1 details and toggles Local RPC smart-account (EIP-7702 upgrade).
 * Appium: name-based ellipsis — index-0 can "succeed" without opening details.
 */
export const openSmartAccountSwitchForSelectedAccount =
  async (): Promise<void> => {
    await WalletView.tapIdenticon();
    await AccountListBottomSheet.waitForAccountListVisible();
    await AccountListBottomSheet.tapAccountEllipsisForAccountNameV2(
      'Account 1',
    );

    await Assertions.expectElementToExist(AccountDetails.container, {
      description: 'Account details after tapping account ellipsis',
      timeout: 15_000,
    });

    await SwitchAccountModal.tapSmartAccountLink();
    await Assertions.expectTextDisplayed('Use smart account', {
      description: 'Smart account network toggle screen',
      timeout: 15_000,
    });
    await SmartAccount.tapSmartAccountSwitchForNetwork(LOCAL_CHAIN_NAME);
    await FooterActions.waitForConfirmButton();
  };

/**
 * After upgrade confirm: Smart Account → Account Details → wallet → Activity,
 * filtered to Local RPC (redesign "All networks" chip).
 */
export const dismissSmartAccountScreensAndOpenFilteredActivity =
  async (): Promise<void> => {
    await FooterActions.tapConfirmButton();
    await FooterActions.waitForConfirmButtonGone();
    await dismissPushNotificationExistingUserSheet();

    await SwitchAccountModal.tapSmartAccountBackButton();
    await AccountDetails.tapBackButton();
    await AccountListBottomSheet.waitForAccountListVisible(10_000);
    await AccountListBottomSheet.tapAccountByNameV2('Account 1');
    await waitForWalletHomePlaywright();

    await TabBarComponent.tapActivity();
    await ActivitiesView.filterByNetwork(LOCAL_CHAIN_CAIP);
  };

export const assertSmartAccountUpgradeActivity = async (
  activityTitle: string,
  timeoutMs = 30_000,
): Promise<void> => {
  await Assertions.expectTextDisplayed(activityTitle, {
    description: `Activity row "${activityTitle}"`,
    timeout: timeoutMs,
  });
};

export const assertUpgradeConfirmationRows = async (): Promise<void> => {
  await Assertions.expectElementToExist(RowComponents.AccountNetwork, {
    description: 'Account Network',
  });
  await Assertions.expectElementToExist(RowComponents.GasFeesDetails, {
    description: 'Gas Fees Details',
  });
  await Assertions.expectElementToExist(RowComponents.AdvancedDetails, {
    description: 'Advanced Details',
  });
};
