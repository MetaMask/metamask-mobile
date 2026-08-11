import Assertions from '../framework/Assertions';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
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
const ANDROID_CONFIRM_POLL_MS = 3_000;
const DAPP_BUTTON_READY_TIMEOUT_MS = 20_000;
const DAPP_BUTTON_READY_POLL_MS = 500;
/** Re-run the dapp's contract binding if it is still missing after this long. */
const DAPP_CONTRACT_RELOAD_AFTER_MS = 8_000;
/**
 * `contractIsDeployed` fills these from the `?contract=` query param. When
 * `initializeContracts()` throws, the listener still enables every button but
 * leaves the address blank, so the handlers call into an undefined contract.
 */
const CONTRACT_ADDRESS_ELEMENT_IDS = [
  'erc20TokenAddresses',
  'erc721TokenAddresses',
  'erc1155TokenAddresses',
];

interface TestDappButtonState {
  href: string;
  documentReady: boolean;
  hasEthereum: boolean;
  hasButton: boolean;
  buttonDisabled: boolean;
  contractParam: string | null;
  contractBound: boolean;
}

const readTestDappButtonState = (
  pageUrl: string,
  buttonId: string,
): Promise<TestDappButtonState | null> =>
  ChromeCdpHelpers.evaluateInWebView<TestDappButtonState>(
    pageUrl,
    `(() => {
      const el = document.getElementById(${JSON.stringify(buttonId)});
      const contractIds = ${JSON.stringify(CONTRACT_ADDRESS_ELEMENT_IDS)};
      return {
        href: location.href,
        documentReady: document.readyState === 'complete',
        hasEthereum: typeof window.ethereum !== 'undefined',
        hasButton: Boolean(el),
        buttonDisabled: Boolean(
          el &&
            (('disabled' in el && el.disabled) ||
              el.getAttribute('aria-disabled') === 'true'),
        ),
        contractParam: new URLSearchParams(location.search).get('contract'),
        contractBound: contractIds.some((id) => {
          const node = document.getElementById(id);
          return Boolean(node && (node.textContent || '').trim());
        }),
      };
    })()`,
  );

const isTestDappButtonReady = (state: TestDappButtonState | null): boolean =>
  Boolean(
    state?.documentReady &&
      state.hasEthereum &&
      state.hasButton &&
      !state.buttonDisabled &&
      (!state.contractParam || state.contractBound),
  );

/**
 * The URL bar shows the dapp URL before the page finishes loading, before the
 * provider is injected, and before the dapp binds the contract from
 * `?contract=`. A tap issued in that window clicks a real DOM node and reports
 * success, but no confirmation is ever requested.
 *
 * Contract binding only happens while initializing the provider, so a reload is
 * the only way to recover a page that came up without it.
 */
const waitForTestDappButtonReady = async (
  pageUrl: string,
  buttonId: string,
  timeoutMs = DAPP_BUTTON_READY_TIMEOUT_MS,
): Promise<TestDappButtonState | null> => {
  const startedAt = Date.now();
  const deadline = startedAt + timeoutMs;
  let state: TestDappButtonState | null = null;
  let reloaded = false;

  while (Date.now() < deadline) {
    state = await readTestDappButtonState(pageUrl, buttonId);
    if (isTestDappButtonReady(state)) {
      return state;
    }

    if (
      !reloaded &&
      state?.contractParam &&
      !state.contractBound &&
      Date.now() - startedAt >= DAPP_CONTRACT_RELOAD_AFTER_MS
    ) {
      reloaded = true;
      await ChromeCdpHelpers.evaluateInWebView(pageUrl, 'location.reload()');
    }

    await sleep(DAPP_BUTTON_READY_POLL_MS);
  }

  return state;
};

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
    let dismissedPushSheet = false;
    let lastState: TestDappButtonState | null = null;
    try {
      await Utilities.executeWithRetry(
        async () => {
          lastState = await waitForTestDappButtonReady(pageUrl, buttonId);
          await WebView.tapById(buttonId, {
            pageUrl,
            description,
          });
          try {
            await FooterActions.waitForConfirmButton(ANDROID_CONFIRM_POLL_MS);
          } catch (error) {
            if (!dismissedPushSheet) {
              dismissedPushSheet = true;
              await dismissPushNotificationExistingUserSheet();
            }
            throw error;
          }
        },
        { timeout: ANDROID_CONFIRM_SHEET_TIMEOUT_MS },
      );
    } catch (error) {
      throw new Error(
        `Confirmation sheet never opened after tapping #${buttonId} (${description}); ` +
          `last dapp state=${JSON.stringify(lastState)}; cause=${
            error instanceof Error ? error.message : String(error)
          }`,
      );
    }
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
