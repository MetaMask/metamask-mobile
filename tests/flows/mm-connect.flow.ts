import { loginToAppPlaywright, unlockIfLockScreenVisible } from './wallet.flow';
import {
  launchMobileBrowser,
  navigateToDapp,
  switchToMobileBrowser,
} from './native-browser.flow';
import AndroidScreenHelpers from '../page-objects/MMConnect/AndroidScreenHelpers';
import DappConnectionModal from '../page-objects/MMConnect/DappConnectionModal';
import SignModal from '../page-objects/MMConnect/SignModal';
import WalletView from '../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../page-objects/wallet/AccountListBottomSheet';
import PlaywrightContextHelpers from '../framework/PlaywrightContextHelpers';
import ChromeCdpHelpers from '../framework/ChromeCdpHelpers';
import PlaywrightUtilities from '../framework/PlaywrightUtilities';
import type { CurrentDeviceDetails } from '../framework/fixtures/playwright';
import {
  DappServer,
  DappVariants,
  PlaywrightGestures,
  TestDapps,
} from '../framework/index';
import { DEFAULT_FIXTURE_ACCOUNT_CHECKSUM } from '../framework/fixtures/FixtureBuilder';
import { APP_PACKAGE_IDS } from '../framework/Constants';
import {
  cleanupAdbReverse,
  setupAdbReverse,
  waitForDappServerReady,
} from '../smoke-appium/mm-connect/utils';
import { MMConnectDappTestIds } from '../selectors/MMConnect/MMConnectDapp.testIds';

export const DEFAULT_MM_CONNECT_DAPP_PORT = 8090;

/** Playground ≥0.8 defaults to Localhost (eip155:1337) on http://localhost. */
export const MAINNET_SCOPE_CHECKBOXES = [
  { scope: 'eip155:1337', checked: false },
  { scope: 'eip155:1', checked: true },
] as const;

export const MM_CONNECT_ACCOUNT_1 = DEFAULT_FIXTURE_ACCOUNT_CHECKSUM;

export const MM_CONNECT_ACCOUNT_3 =
  '0x08C215b461932f44Fab0D15E5d1FF4C5aF591AF0';

/** Default HD account labels in the e2e vault. */
export const MM_CONNECT_ACCOUNT_1_NAME = 'Account 1';
export const MM_CONNECT_ACCOUNT_3_NAME = 'Account 3';

export const scopeCardTestId = (scope: string): string =>
  `${MMConnectDappTestIds.SCOPE_CARD}-${scope.toLowerCase().replace(/:/g, '-')}`;

/**
 * Create a Browser Playground dapp server instance.
 */
export function createBrowserPlaygroundServer(
  port: number = DEFAULT_MM_CONNECT_DAPP_PORT,
): DappServer {
  const server = new DappServer({
    dappCounter: 0,
    rootDirectory: TestDapps[DappVariants.BROWSER_PLAYGROUND].dappPath,
    dappVariant: DappVariants.BROWSER_PLAYGROUND,
  });
  server.setServerPort(port);
  return server;
}

/**
 * Start playground server, wait until ready, and set ADB reverse for Android.
 */
export async function startBrowserPlaygroundServer(
  server: DappServer,
  port: number = DEFAULT_MM_CONNECT_DAPP_PORT,
): Promise<void> {
  await server.start();
  await waitForDappServerReady(port);
  setupAdbReverse(port);
}

/**
 * Tear down ADB reverse and stop the playground server.
 */
export async function stopBrowserPlaygroundServer(
  server: DappServer,
  port: number = DEFAULT_MM_CONNECT_DAPP_PORT,
): Promise<void> {
  cleanupAdbReverse(port);
  await server.stop();
}

/**
 * Login (e2e vault), launch Chrome with FRE dismissed, and open the dapp URL.
 */
export async function loginLaunchAndOpenDapp(dappUrl: string): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    await launchMobileBrowser({ safelyOnboardChrome: true });
    await navigateToDapp(dappUrl);
  });
}

/**
 * Create new HD accounts (Account 2…), leave Account 1
 * selected, then launch Chrome and open the dapp.
 */
export async function loginCreateAccountsAndOpenDapp(
  dappUrl: string,
  extraHdAccounts: number,
): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    if (extraHdAccounts > 0) {
      await WalletView.tapIdenticon();
      for (let i = 0; i < extraHdAccounts; i++) {
        await AccountListBottomSheet.tapAddAccountButtonV2();
      }
      await AccountListBottomSheet.tapAccountByNameV2(
        MM_CONNECT_ACCOUNT_1_NAME,
        true,
      );
    }
    await launchMobileBrowser({ safelyOnboardChrome: true });
    await navigateToDapp(dappUrl);
  });
}

/**
 * Click a dapp control that opens MetaMask via CDP-captured deeplink.
 */
export async function clickDappOpeningMetaMask(
  dappUrl: string,
  testId: string,
): Promise<void> {
  PlaywrightUtilities.collapseStatusBar();
  await ChromeCdpHelpers.waitAndClickTestIdOpeningMetaMask(dappUrl, testId);
}

/**
 * Handle Android deeplink chooser + connect sheet, then wait for the return toast.
 */
export async function approveConnectInMetaMask({
  timeout = 30_000,
  additionalAccounts = [],
}: {
  timeout?: number;
  /** Account names to enable on the connect sheet (e.g. `['Account 3']`). */
  additionalAccounts?: string[];
} = {}): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    // Auto-lock often appears immediately after deeplink/chooser — unlock
    // before (and while) waiting for the connect sheet.
    await unlockIfLockScreenVisible();
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask();
    await unlockIfLockScreenVisible();
    if (additionalAccounts.length > 0) {
      await DappConnectionModal.tapEditAccountsButton();
      for (const accountName of additionalAccounts) {
        await DappConnectionModal.tapAccountButton(accountName);
      }
      await DappConnectionModal.tapUpdateAccountsButton();
    }
    await DappConnectionModal.tapConnectButton({ timeout });
    // Let the success toast dismiss so the un-awaited relay write flushes
    // before backgrounding MetaMask.
    await DappConnectionModal.waitForReturnToAppToastToDismiss();
  });
}

/**
 * Open MetaMask from a dapp control and approve the connection request.
 */
export async function connectDappViaMetaMask(
  dappUrl: string,
  connectTestId: string = MMConnectDappTestIds.CONNECT_BUTTON,
  options?: { additionalAccounts?: string[] },
): Promise<void> {
  await clickDappOpeningMetaMask(dappUrl, connectTestId);
  await approveConnectInMetaMask(options);
}

/**
 * Legacy EVM connect via Browser Playground Connect (Legacy) button.
 */
export async function connectLegacyDappViaMetaMask(
  dappUrl: string,
  options?: { additionalAccounts?: string[] },
): Promise<void> {
  await connectDappViaMetaMask(
    dappUrl,
    MMConnectDappTestIds.CONNECT_BUTTON_LEGACY,
    options,
  );
}

/**
 * Switch back to Chrome and wait for a dapp via CDP.
 */
export async function returnToDappAndWaitFor(
  dappUrl: string,
  testId: string,
  timeoutMs = 30_000,
): Promise<void> {
  await switchToMobileBrowser();
  // Give Chrome a beat to foreground before Appium/CDP probes (avoids hung
  // getContexts / missing DevTools right after MetaMask deeplink handoff).
  await new Promise((r) => setTimeout(r, 1_000));
  await ChromeCdpHelpers.waitForTestId(dappUrl, testId, timeoutMs);
}

/**
 * Assert Legacy EVM playground shows connected state for the given account.
 */
export async function assertLegacyEvmConnected(
  dappUrl: string,
  {
    chainId,
    activeAccount,
  }: {
    chainId?: string;
    activeAccount: string;
  },
): Promise<void> {
  await ChromeCdpHelpers.waitForTestId(
    dappUrl,
    MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
  );
  if (chainId) {
    await ChromeCdpHelpers.waitForTestIdTextContaining(
      dappUrl,
      MMConnectDappTestIds.LEGACY_EVM_CHAIN_ID_VALUE,
      chainId,
    );
  }
  await ChromeCdpHelpers.waitForTestIdTextContaining(
    dappUrl,
    MMConnectDappTestIds.LEGACY_EVM_ACTIVE_ACCOUNT,
    activeAccount,
  );
}

/**
 * Assert Legacy EVM playground is disconnected (Connect Legacy visible).
 */
export async function assertLegacyEvmDisconnected(
  dappUrl: string,
): Promise<void> {
  await ChromeCdpHelpers.waitForTestId(
    dappUrl,
    MMConnectDappTestIds.CONNECT_BUTTON_LEGACY,
  );
}

/**
 * Bring MetaMask to foreground and select an account from the account list.
 */
export async function switchWalletAccount(
  accountName: string,
  currentDeviceDetails: CurrentDeviceDetails,
): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await PlaywrightGestures.activateApp(currentDeviceDetails);
    await unlockIfLockScreenVisible();
    await WalletView.tapIdenticon();
    const exactMatch = accountName !== MM_CONNECT_ACCOUNT_3_NAME;
    await AccountListBottomSheet.tapAccountByNameV2(accountName, exactMatch);
  });
}

/**
 * Request personal_sign from the Legacy EVM card and cancel in MetaMask.
 *
 * CI google_apis Chrome often sits on FRE while backgrounded; warm it first,
 * then foreground MetaMask and CDP-click so the SDK can deliver the request.
 * Do not `activateApp` after the click — that can tear down the confirmation.
 * Cancel via SignModal only (wait for redesign surface, not bare cancel-button);
 * do not route through the deeplink chooser helper — collapseStatusBar there can
 * dismiss an in-session sheet that is still animating in.
 */
export async function rejectLegacyPersonalSign(
  dappUrl: string,
  currentDeviceDetails?: CurrentDeviceDetails,
): Promise<void> {
  // Warm Chrome / clear FRE so a backgrounded tab can still serve CDP + SDK.
  await switchToMobileBrowser();
  PlaywrightUtilities.collapseStatusBar();

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await PlaywrightGestures.activateApp(
      currentDeviceDetails,
      APP_PACKAGE_IDS.ANDROID,
    );
  });

  await ChromeCdpHelpers.waitAndClickTestId(
    dappUrl,
    MMConnectDappTestIds.LEGACY_EVM_BTN_PERSONAL_SIGN,
  );

  await PlaywrightContextHelpers.withNativeAction(async () => {
    await SignModal.tapCancelButton({
      timeout: 30_000,
      shouldCooldown: true,
      timeToCooldown: 2_000,
    });
  });

  await switchToMobileBrowser();
  await ChromeCdpHelpers.waitForTestIdTextContaining(
    dappUrl,
    MMConnectDappTestIds.LEGACY_EVM_RESPONSE_TEXT,
    'rejected',
    30_000,
  );
}

/**
 * Handle deeplink chooser and cancel a sign confirmation.
 */
export async function rejectSignInMetaMask(): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await unlockIfLockScreenVisible();
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask({
      awaitSheet: 'sign',
    });
    await unlockIfLockScreenVisible();
    await SignModal.tapCancelButton();
  });
}

/**
 * Handle deeplink chooser and confirm a sign request.
 */
export async function confirmSignInMetaMask(): Promise<void> {
  await PlaywrightContextHelpers.withNativeAction(async () => {
    await unlockIfLockScreenVisible();
    await AndroidScreenHelpers.tapOpenDeeplinkWithMetaMask({
      awaitSheet: 'sign',
    });
    await unlockIfLockScreenVisible();
    await SignModal.tapConfirmButton();
  });
}

/**
 * Opt Multichain playground scopes into Ethereum Mainnet (eip155:1).
 */
export async function ensureMainnetScopeCheckboxes(
  dappUrl: string,
): Promise<void> {
  PlaywrightUtilities.collapseStatusBar();
  await ChromeCdpHelpers.ensureScopeCheckboxes(
    dappUrl,
    MAINNET_SCOPE_CHECKBOXES,
  );
}
