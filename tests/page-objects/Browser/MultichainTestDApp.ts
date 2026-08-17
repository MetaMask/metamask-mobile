import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { MultichainTestDappViewSelectorsIDs } from '../../selectors/Browser/MultichainTestDapp.selectors.js';
import { createLogger } from '../../framework/logger.js';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  applyNetworkSelection,
  clearSessionResult,
  readAllCheckboxStates,
  readConnectionState,
  type ConnectionState,
  MULTICHAIN_TEST_DAPP_BASE_URL,
} from './MultichainTestDAppNetworkSelection.js';

const logger = createLogger({
  name: 'MultichainTestDApp',
});

export const MULTICHAIN_DAPP_PORT = 8093;

interface SessionResponse {
  success: boolean;
  sessionScopes?: {
    [chainId: string]: {
      accounts: string[];
      methods?: string[];
    };
  };
}

const SELECTORS = MultichainTestDappViewSelectorsIDs;
const BASE_URL = MULTICHAIN_TEST_DAPP_BASE_URL;
const DEFAULT_URL_PARAMS = '?autoMode=true';

/**
 * The dapp keeps the network checkboxes and the session buttons disabled until
 * its postMessage handshake resolves, and it rebuilds the whole checkbox
 * selection from `wallet_getSession` once connected. Toggling before both have
 * settled is silently discarded, so every toggle is verified and retried.
 */
const CONNECT_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class MultichainTestDApp {
  private connected = false;

  async setupAndNavigateToTestDapp(
    urlParams = DEFAULT_URL_PARAMS,
    skipLogin?: boolean,
  ): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    this.connected = false;
    if (!skipLogin) {
      await loginToAppPlaywright({ scenarioType: 'e2e' });
    }
    await navigateToBrowserView();
    // On fresh CI Android devices the push-notification opt-in sheet ("Never
    // miss a move") can reappear after navigation even though loginToApp
    // already dismissed it once. Dismiss it again before touching the browser.
    await dismissPushNotificationExistingUserSheet();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL + urlParams);
  }

  async scrollToPageTop(): Promise<void> {
    await ChromeCdpHelpers.evaluateInWebView(
      BASE_URL,
      'window.scrollTo(0, 0)',
    ).catch(() => undefined);
  }

  async useAutoConnectButton(): Promise<boolean> {
    if (this.connected) return true;
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.AUTO_CONNECT_BUTTON,
    );
    if (!clicked) {
      logger.warn(`could not click #${SELECTORS.AUTO_CONNECT_BUTTON}`);
      return false;
    }
    this.connected = await this.waitForDappConnected();
    return this.connected;
  }

  async createSessionWithNetworks(chainIds: string[]): Promise<void> {
    await this.scrollToPageTop();
    const connected = await this.useAutoConnectButton();
    if (!connected)
      throw new Error('createSessionWithNetworks: auto-connect failed');

    await applyNetworkSelection(chainIds);

    await clearSessionResult();
    await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.CREATE_SESSION_BUTTON,
    );

    try {
      await DappConnectionModal.tapConnectButton({ timeout: 30_000 });
    } catch {
      // No modal — session may already be approved
    }

    const result = await ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      `${SELECTORS.SESSION_METHOD_RESULT}0`,
      30_000,
    );
    if (result) {
      logger.debug(`wallet_createSession result: ${result.slice(0, 500)}`);
    } else {
      logger.warn(
        `no text in #${SELECTORS.SESSION_METHOD_RESULT}0 after 30s; checkboxes: ${JSON.stringify(
          await readAllCheckboxStates(),
        )}`,
      );
    }
  }

  /**
   * Waits until the dapp has finished its wallet handshake, which is what
   * enables the network checkboxes and the session buttons.
   */
  async waitForDappConnected(timeoutMs = CONNECT_TIMEOUT_MS): Promise<boolean> {
    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    let state: ConnectionState = 'unreadable';

    while (Date.now() < deadline) {
      state = await readConnectionState();
      if (state === 'enabled') {
        logger.debug(`dapp connected after ${Date.now() - startedAt}ms`);
        return true;
      }
      await wait(POLL_INTERVAL_MS);
    }

    logger.warn(
      `dapp still not connected after ${timeoutMs}ms (#${SELECTORS.CREATE_SESSION_BUTTON} is "${state}")`,
    );
    return false;
  }

  async tapGetSessionButton(): Promise<void> {
    await clearSessionResult();
    await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.GET_SESSION_BUTTON,
    );
  }

  async tapRevokeSessionButton(): Promise<void> {
    await clearSessionResult();
    await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.REVOKE_SESSION_BUTTON,
    );
  }

  async getSessionData(resultIndex = 0): Promise<SessionResponse> {
    const resultId = `${SELECTORS.SESSION_METHOD_RESULT}${resultIndex}`;
    const text = await ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      resultId,
      30_000,
    );
    if (!text)
      throw new Error(`getSessionData: timed out waiting for #${resultId}`);
    const parsed = JSON.parse(text);
    const scopes =
      parsed !== null && typeof parsed === 'object'
        ? parsed.sessionScopes
        : undefined;
    return {
      success: Boolean(scopes && Object.keys(scopes).length > 0),
      sessionScopes: scopes ?? {},
    };
  }

  async getSessionChangedEventData(
    index = 0,
    timeoutMs = 10_000,
  ): Promise<string | null> {
    return ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      `${SELECTORS.WALLET_SESSION_CHANGED_RESULT}${index}`,
      timeoutMs,
    );
  }

  async invokeMethodOnChain(
    chainId: string,
    method: string,
    timeoutMs = 30_000,
  ): Promise<boolean> {
    const elementId = `${SELECTORS.DIRECT_INVOKE_PREFIX}eip155-${chainId}-${method}`;
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        BASE_URL,
        elementId,
      );
      if (clicked) return true;
      await wait(500);
    }
    logger.warn(
      `#${elementId} never became clickable within ${timeoutMs}ms; scopes rendered by the dapp: ${JSON.stringify(
        await this.readRenderedScopes(),
      )}`,
    );
    return false;
  }

  /**
   * Lists the scopes the dapp currently renders method buttons for. The dapp
   * only renders them for granted session scopes, so this shows whether a
   * missing invoke button means a missing permission.
   */
  private async readRenderedScopes(): Promise<string[]> {
    const raw = await ChromeCdpHelpers.evaluateInWebView<string>(
      BASE_URL,
      `JSON.stringify(
        Array.from(document.querySelectorAll('[id^="direct-methods-"]')).map(
          (el) => el.id.replace('direct-methods-', ''),
        ),
      )`,
    );
    if (!raw) return [];
    try {
      return JSON.parse(raw) as string[];
    } catch {
      return [];
    }
  }

  async getInvokeMethodResult(
    chainId: string,
    method: string,
    index = 0,
  ): Promise<string | null> {
    const elementId = `${SELECTORS.INVOKE_METHOD_RESULT_PREFIX}eip155-${chainId}-${method}-result-${index}`;
    return ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      elementId,
      10_000,
    );
  }

  async invokeMethod(
    chainId: string,
    method: string,
    params?: unknown[],
  ): Promise<void> {
    const scopeId = `eip155-${chainId}`;

    if (!params) {
      await ChromeCdpHelpers.clickByIdInWebView(
        BASE_URL,
        `${SELECTORS.DIRECT_INVOKE_PREFIX}${scopeId}-${method}`,
      );
      return;
    }

    const scope = `eip155:${chainId}`;
    const requestBody = JSON.stringify(
      {
        method: 'wallet_invokeMethod',
        params: { scope, request: { method, params } },
      },
      null,
      2,
    );

    await ChromeCdpHelpers.evaluateInWebView<boolean>(
      BASE_URL,
      `(function(){
        const sel = document.getElementById('method-select-${scopeId}');
        if (!sel) return false;
        sel.value = ${JSON.stringify(method)};
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        return true;
      })()`,
    );

    await ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      `invoke-method-request-${scopeId}`,
      5_000,
    );

    await ChromeCdpHelpers.evaluateInWebView<boolean>(
      BASE_URL,
      `(function(){
        const ta = document.getElementById('invoke-method-request-${scopeId}');
        if (!ta) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, ${JSON.stringify(requestBody)});
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        return true;
      })()`,
    );

    // Poll from the framework until the invoke button becomes enabled
    const buttonId = `invoke-method-${scopeId}-btn`;
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const disabled = await ChromeCdpHelpers.evaluateInWebView<boolean>(
        BASE_URL,
        `Boolean(document.getElementById(${JSON.stringify(buttonId)})?.disabled)`,
      );
      if (!disabled) break;
      await new Promise<void>((r) => setTimeout(r, 100));
    }

    await ChromeCdpHelpers.clickByIdInWebView(BASE_URL, buttonId);
  }

  async tapConfirmButton(): Promise<void> {
    const el = await PlaywrightMatchers.getElementById(
      ConfirmationFooterSelectorIDs.CONFIRM_BUTTON,
    );
    await PlaywrightGestures.waitAndTap(el, {
      checkForDisplayed: true,
      checkForEnabled: true,
    });
  }

  async tapCancelButton(timeout = 15_000): Promise<void> {
    const el = await PlaywrightMatchers.getElementById(
      ConfirmationFooterSelectorIDs.CANCEL_BUTTON,
    );
    await PlaywrightGestures.waitAndTap(el, {
      timeout,
      checkForDisplayed: true,
    });
  }

  async subscribeToChainEvents(chainId: string): Promise<boolean> {
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      `${SELECTORS.DIRECT_INVOKE_PREFIX}eip155-${chainId}-eth_subscribe`,
    );
    if (!clicked) return false;
    const resultId = `${SELECTORS.INVOKE_METHOD_RESULT_PREFIX}eip155-${chainId}-eth_subscribe-result-0`;
    const text = await ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      resultId,
      10_000,
    );
    return text !== null && text.trim().length > 0;
  }

  async isNotificationContainerEmpty(): Promise<boolean> {
    return (
      (await ChromeCdpHelpers.readTextByIdInWebView(
        BASE_URL,
        SELECTORS.WALLET_NOTIFY_EMPTY,
      )) !== null
    );
  }

  async hasNotifications(): Promise<boolean> {
    return (
      (await ChromeCdpHelpers.waitForElementTextInWebView(
        BASE_URL,
        `${SELECTORS.WALLET_NOTIFY_DETAILS}0`,
        50_000,
      )) !== null
    );
  }
}

export default new MultichainTestDApp();
