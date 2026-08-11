import Assertions from '../framework/Assertions';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';
import { PlatformDetector } from '../framework/PlatformLocator';
import Utilities, { sleep } from '../framework/Utilities';
import WebView from '../framework/WebView';
import Browser from '../page-objects/Browser/BrowserView';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import FooterActions from '../page-objects/Browser/Confirmations/FooterActions';
import RowComponents from '../page-objects/Browser/Confirmations/RowComponents';
import TestDApp from '../page-objects/Browser/TestDApp';
import NetworkListModal from '../page-objects/Network/NetworkListModal';
import AccountDetails from '../page-objects/MultichainAccounts/AccountDetails';
import SmartAccount from '../page-objects/MultichainAccounts/SmartAccount';
import SendView from '../page-objects/Send/RedesignedSendView';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import NetworkManager from '../page-objects/wallet/NetworkManager';
import SwitchAccountModal from '../page-objects/wallet/SwitchAccountModal';
import ActivitiesView from '../page-objects/Transactions/ActivitiesView';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletView from '../page-objects/wallet/WalletView';
import { TestDappSelectorsWebIDs } from '../selectors/Browser/TestDapp.selectors';
import { navigateToBrowserView, waitForTestDappToLoad } from './browser.flow';
import {
  dismissPushNotificationExistingUserSheet,
  waitForWalletHomePlaywright,
} from './wallet.flow';

const LOCAL_CHAIN_NAME = 'Local RPC';
const LOCAL_CHAIN_CAIP = 'eip155:1337';
const SMART_ACCOUNT_UPGRADED_ACTIVITY = 'Smart account upgraded';
const SMART_ACCOUNT_UPGRADING_ACTIVITY = 'Upgrading smart account';
const ANDROID_CONFIRM_SHEET_TIMEOUT_MS = 60_000;
/** Per-tap wait for the confirmation sheet (gas estimation can exceed a few seconds). */
const ANDROID_CONFIRM_AFTER_TAP_MS = 15_000;
const TEST_DAPP_PROVIDER_READY_TIMEOUT_MS = 30_000;
const TEST_DAPP_ACCOUNTS_HYDRATE_TIMEOUT_MS = 30_000;
const TEST_DAPP_BUTTON_ENABLED_TIMEOUT_MS = 30_000;

export {
  LOCAL_CHAIN_CAIP,
  SMART_ACCOUNT_UPGRADED_ACTIVITY,
  SMART_ACCOUNT_UPGRADING_ACTIVITY,
};

/**
 * Wait until the Test Dapp has an injected provider with a selected account.
 * Connected fixtures still need provider injection before action buttons enable.
 */
const waitForTestDappProviderReady = async (pageUrl: string): Promise<void> => {
  try {
    await Utilities.waitUntil(
      async () => {
        const ready = await ChromeCdpHelpers.evaluateInWebView<boolean>(
          pageUrl,
          `(() => {
            const eth = window.ethereum;
            if (!eth) return false;
            if (
              typeof eth.selectedAddress === 'string' &&
              eth.selectedAddress.length > 0
            ) {
              return true;
            }
            const accountsEl = document.getElementById(${JSON.stringify(
              TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
            )});
            const accountsText = (accountsEl?.textContent || '')
              .replace(/^Accounts:\\s*/i, '')
              .trim();
            return accountsText.length > 0;
          })()`,
        );
        return Boolean(ready);
      },
      { timeout: TEST_DAPP_PROVIDER_READY_TIMEOUT_MS, interval: 500 },
    );
  } catch (error) {
    throw new Error(
      `Test dapp provider not ready within ${TEST_DAPP_PROVIDER_READY_TIMEOUT_MS}ms` +
        ` (window.ethereum / selectedAddress / #${TestDappSelectorsWebIDs.ACCOUNTS_TEXT}): ${
          error instanceof Error ? error.message : String(error)
        }`,
    );
  }
};

type TestDappConnectionState = {
  accountsUi: string;
  ethAccountCount: number;
  connectLabel: string;
  hasProviderRequest: boolean;
};

const readTestDappConnectionState = async (
  pageUrl: string,
): Promise<TestDappConnectionState | null> =>
  ChromeCdpHelpers.evaluateInWebView<TestDappConnectionState>(
    pageUrl,
    `(async () => {
      const accountsEl = document.getElementById(${JSON.stringify(
        TestDappSelectorsWebIDs.ACCOUNTS_TEXT,
      )});
      const connectEl = document.getElementById(${JSON.stringify(
        TestDappSelectorsWebIDs.CONNECT_BUTTON,
      )});
      const eth = window.ethereum;
      let ethAccounts = [];
      if (eth && typeof eth.request === 'function') {
        try {
          ethAccounts = await eth.request({ method: 'eth_accounts' });
        } catch (_error) {
          ethAccounts = [];
        }
      }
      return {
        accountsUi: (accountsEl?.textContent || '')
          .replace(/^Accounts:\\s*/i, '')
          .trim(),
        ethAccountCount: Array.isArray(ethAccounts) ? ethAccounts.length : 0,
        connectLabel: (connectEl?.textContent || '').trim(),
        hasProviderRequest: Boolean(eth && typeof eth.request === 'function'),
      };
    })()`,
  );

const isTestDappAccountsHydrated = (
  state: TestDappConnectionState | null,
): boolean =>
  Boolean(
    state?.hasProviderRequest &&
      state.ethAccountCount > 0 &&
      state.accountsUi.length > 0,
  );

/**
 * After navigation/reload, MetaMask may inject `window.ethereum` before the
 * Test Dapp finishes `initializeProvider` → `handleNewAccounts`. Faking
 * `globalConnectionChange` enables buttons while `src.provider` / accounts stay
 * unset (CI screenshots: "NOT CONNECTED", Account `undefined`). Click Connect
 * so the dapp runs its real eth_requestAccounts handler; approve the sheet only
 * if it appears (fixture permissions often resolve without UI).
 */
const ensureTestDappAccountsHydrated = async (
  pageUrl: string,
): Promise<void> => {
  const deadline = Date.now() + TEST_DAPP_ACCOUNTS_HYDRATE_TIMEOUT_MS;
  let lastConnectClickAt = 0;

  while (Date.now() < deadline) {
    const state = await readTestDappConnectionState(pageUrl);
    if (isTestDappAccountsHydrated(state)) {
      return;
    }

    // Click Connect whenever the dapp is not hydrated yet. Fixture permissions
    // usually resolve eth_requestAccounts without a sheet; that still runs
    // handleNewAccounts and sets `src.connected`.
    if (
      state?.hasProviderRequest &&
      state.connectLabel !== 'Connected' &&
      Date.now() - lastConnectClickAt >= 1_500
    ) {
      lastConnectClickAt = Date.now();
      await ChromeCdpHelpers.evaluateInWebView<boolean>(
        pageUrl,
        `(() => {
          const el = document.getElementById(${JSON.stringify(
            TestDappSelectorsWebIDs.CONNECT_BUTTON,
          )});
          if (!el || typeof el.click !== 'function') return false;
          if ('disabled' in el && Boolean(el.disabled)) return false;
          el.click();
          return true;
        })()`,
      );

      try {
        await Assertions.expectElementToBeVisible(
          ConnectBottomSheet.connectButton,
          {
            timeout: 2_500,
            description: 'Connect account sheet after Test Dapp Connect',
          },
        );
        await ConnectBottomSheet.tapConnectButton();
      } catch {
        // Already permitted — eth_requestAccounts resolves without a sheet.
      }
    }

    await sleep(400);
  }

  const finalState = await readTestDappConnectionState(pageUrl);
  throw new Error(
    `Test dapp accounts never hydrated within ${TEST_DAPP_ACCOUNTS_HYDRATE_TIMEOUT_MS}ms` +
      ` (state=${JSON.stringify(finalState)})`,
  );
};

/**
 * Tap a test-dapp WebView button and wait for the confirmation sheet.
 *
 * Android: wait for provider + real Test Dapp account hydration + enabled
 * control, then tap like signature smokes (`WebView.tapById`). Wait long enough
 * after each tap for gas estimation — re-tapping every few seconds rejects
 * in-flight `eth_sendTransaction` ("Creation Failed" on the Test Dapp).
 */
const tapTestDappButtonAndWaitForConfirm = async (
  buttonId: string,
  description: string,
): Promise<void> => {
  const pageUrl = getDappUrl(0);
  const confirmTimeoutMs = 30_000;

  if (FrameworkDetector.isAppium()) {
    await waitForTestDappProviderReady(pageUrl);
    await ensureTestDappAccountsHydrated(pageUrl);
    await ChromeCdpHelpers.waitForElementEnabledByIdInWebView(
      pageUrl,
      buttonId,
      TEST_DAPP_BUTTON_ENABLED_TIMEOUT_MS,
    );
  }

  if (PlatformDetector.isAndroidAppium()) {
    let dismissedPushSheet = false;
    let attempt = 0;
    await Utilities.executeWithRetry(
      async () => {
        attempt += 1;
        await WebView.tapById(buttonId, {
          pageUrl,
          description,
          // First attempt matches signature smokes (CDP then native). Later
          // attempts force native in case CDP reported a false-success click.
          preferNative: attempt > 1,
        });
        try {
          await FooterActions.waitForConfirmButton(
            ANDROID_CONFIRM_AFTER_TAP_MS,
          );
        } catch (error) {
          if (!dismissedPushSheet) {
            dismissedPushSheet = true;
            await dismissPushNotificationExistingUserSheet();
            // Push sheet may have covered confirm — check again before re-tap.
            try {
              await FooterActions.waitForConfirmButton(5_000);
              return;
            } catch {
              // Fall through to retry with another tap.
            }
          }
          throw error;
        }
      },
      {
        timeout: ANDROID_CONFIRM_SHEET_TIMEOUT_MS,
        // Keep retries sparse so we do not stampede eth_sendTransaction.
        interval: 2_000,
      },
    );
    return;
  }

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
 * Wallet → Network Manager → select a popular/default network by name.
 */
export const changeNetworkFromNetworkManager = async (
  networkName: string,
): Promise<void> => {
  await TabBarComponent.tapWallet();
  await NetworkManager.navigateToTokensFullView();
  await NetworkManager.openNetworkManager();
  await NetworkListModal.changeNetworkTo(networkName);
  await NetworkManager.navigateBackFromTokensFullView();
};

/**
 * Wallet → Network Manager → Custom tab → select network by name.
 */
export const selectCustomNetworkFromNetworkManager = async (
  networkName: string,
): Promise<void> => {
  await TabBarComponent.tapWallet();
  await NetworkManager.navigateToTokensFullView();
  await NetworkManager.openNetworkManager();
  await NetworkListModal.tapOnCustomTab();
  await NetworkListModal.selectNetworkInCustomTab(networkName);
  await NetworkManager.navigateBackFromTokensFullView();
};

/**
 * Starts a redesigned Send of native ETH amount "5" through the review screen.
 */
export const startRedesignedNativeSendFiveEthToReview = async (
  recipientAddress: string,
): Promise<void> => {
  await WalletView.tapWalletSendButton();
  await SendView.selectEthereumToken();
  await SendView.pressAmountFiveButton();
  await SendView.pressContinueButton();
  await SendView.inputRecipientAddress(recipientAddress);
  await SendView.pressReviewButton();
};

/**
 * Sponsored EIP-7702 native send: review → MetaMask-paid gas → confirm → Activity.
 * Caller must already be logged in.
 */
export const confirmSponsoredNativeSendAndOpenActivity =
  async (): Promise<void> => {
    await Assertions.expectElementToBeVisible(RowComponents.GasFeesDetails, {
      description: 'gas fees row is present on review screen',
      timeout: 30000,
    });
    await Assertions.expectElementToBeVisible(
      RowComponents.NetworkFeePaidByMetaMask,
      {
        description:
          'network fee shows MetaMask-sponsored gas after relay + simulation settle',
        timeout: 60000,
      },
    );
    await Utilities.waitForElementToBeVisible(FooterActions.confirmButton);
    await Utilities.waitForElementToStopMoving(FooterActions.confirmButton, {
      timeout: 5000,
      interval: 500,
      stableCount: 6,
    });
    await FooterActions.tapConfirmButton();
    await TabBarComponent.tapActivity();
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
