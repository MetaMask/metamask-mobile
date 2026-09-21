import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow';
import { navigateToBrowserView } from '../../flows/browser.flow';
import BrowserView from './BrowserView';
import DappConnectionModal from '../MMConnect/DappConnectionModal';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers';
import Gestures from '../../framework/Gestures';
import Matchers from '../../framework/Matchers';
import { MultichainTestDappViewSelectorsIDs } from '../../selectors/Browser/MultichainTestDapp.selectors';
import { createLogger } from '../../framework/logger';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';
import {
  applyNetworkSelection,
  clearSessionResult,
  getMultichainTestDappBaseUrl,
  MULTICHAIN_DAPP_DEVICE_PORT,
  readAllCheckboxStates,
  readConnectionState,
  type ConnectionState,
} from './MultichainTestDAppNetworkSelection';

const logger = createLogger({
  name: 'MultichainTestDApp',
});

export const MULTICHAIN_DAPP_PORT = MULTICHAIN_DAPP_DEVICE_PORT;

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
const DEFAULT_URL_PARAMS = '?autoMode=true';

/**
 * The dapp keeps the network checkboxes and the session buttons disabled until
 * its postMessage handshake resolves, and it rebuilds the whole checkbox
 * selection from `wallet_getSession` once connected. Toggling before both have
 * settled is silently discarded, so every toggle is verified and retried.
 */
const CONNECT_TIMEOUT_MS = 30_000;
const OPERATION_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class MultichainTestDApp {
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
    await BrowserView.navigateToURL(getMultichainTestDappBaseUrl() + urlParams);
  }

  async scrollToPageTop(): Promise<void> {
    await ChromeCdpHelpers.evaluateInWebView(
      getMultichainTestDappBaseUrl(),
      'window.scrollTo(0, 0)',
    ).catch(() => undefined);
  }

  async useAutoConnectButton(): Promise<boolean> {
    if (this.connected) return true;

    // autoMode can finish its handshake before this method runs. Clicking the
    // auto-connect control in that state can start a second handshake and
    // briefly disable the session controls again.
    if ((await readConnectionState()) === 'enabled') {
      this.connected = true;
      return true;
    }

    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      getMultichainTestDappBaseUrl(),
      SELECTORS.AUTO_CONNECT_BUTTON,
      OPERATION_TIMEOUT_MS,
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
      throw new Error(
        `createSessionWithNetworks: auto-connect failed (dapp URL ${getMultichainTestDappBaseUrl()})`,
      );

    await applyNetworkSelection(chainIds);

    await clearSessionResult();
    await this.clickDappButton(
      SELECTORS.CREATE_SESSION_BUTTON,
      'create session',
    );

    try {
      await DappConnectionModal.tapConnectButton({ timeout: 30_000 });
    } catch {
      // No modal — session may already be approved
    }

    const result = await ChromeCdpHelpers.waitForElementTextInWebView(
      getMultichainTestDappBaseUrl(),
      `${SELECTORS.SESSION_METHOD_RESULT}0`,
      30_000,
    );
    if (result) {
      logger.debug(`wallet_createSession result: ${result.slice(0, 500)}`);
      return;
    }

    if (chainIds.length > 0) {
      throw new Error(
        `wallet_createSession produced no result; checkboxes: ${JSON.stringify(
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
    await this.clickDappButton(SELECTORS.GET_SESSION_BUTTON, 'get session');
  }

  async tapRevokeSessionButton(): Promise<void> {
    await clearSessionResult();
    await this.clickDappButton(
      SELECTORS.REVOKE_SESSION_BUTTON,
      'revoke session',
    );
  }

  async getSessionData(resultIndex = 0): Promise<SessionResponse> {
    const resultId = `${SELECTORS.SESSION_METHOD_RESULT}${resultIndex}`;
    const text = await ChromeCdpHelpers.waitForElementTextInWebView(
      getMultichainTestDappBaseUrl(),
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
      getMultichainTestDappBaseUrl(),
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
        getMultichainTestDappBaseUrl(),
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
      getMultichainTestDappBaseUrl(),
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
    timeoutMs = OPERATION_TIMEOUT_MS,
  ): Promise<string | null> {
    const elementId = `${SELECTORS.INVOKE_METHOD_RESULT_PREFIX}eip155-${chainId}-${method}-result-${index}`;
    return ChromeCdpHelpers.waitForElementTextInWebView(
      getMultichainTestDappBaseUrl(),
      elementId,
      timeoutMs,
    );
  }

  async invokeMethod(
    chainId: string,
    method: string,
    params?: unknown[],
  ): Promise<void> {
    const scopeId = `eip155-${chainId}`;

    if (!params) {
      await this.clickDappButton(
        `${SELECTORS.DIRECT_INVOKE_PREFIX}${scopeId}-${method}`,
        `invoke ${method} on ${chainId}`,
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

    const methodSelectId = `method-select-${scopeId}`;
    await ChromeCdpHelpers.waitForElementEnabledByIdInWebView(
      getMultichainTestDappBaseUrl(),
      methodSelectId,
      OPERATION_TIMEOUT_MS,
    );
    const selected = await ChromeCdpHelpers.evaluateInWebView<boolean>(
      getMultichainTestDappBaseUrl(),
      `(function(){
        const sel = document.getElementById(${JSON.stringify(methodSelectId)});
        if (!sel) return false;
        sel.value = ${JSON.stringify(method)};
        sel.dispatchEvent(new Event('change', {bubbles: true}));
        return true;
      })()`,
    );
    if (!selected) {
      throw new Error(
        `invokeMethod: method selector for ${scopeId} was not ready`,
      );
    }

    const requestInputId = `invoke-method-request-${scopeId}`;
    await ChromeCdpHelpers.waitForElementEnabledByIdInWebView(
      getMultichainTestDappBaseUrl(),
      requestInputId,
      OPERATION_TIMEOUT_MS,
    );
    const requestSet = await ChromeCdpHelpers.evaluateInWebView<boolean>(
      getMultichainTestDappBaseUrl(),
      `(function(){
        const ta = document.getElementById(${JSON.stringify(requestInputId)});
        if (!ta) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
        setter.call(ta, ${JSON.stringify(requestBody)});
        ta.dispatchEvent(new Event('input', {bubbles: true}));
        return true;
      })()`,
    );
    if (!requestSet) {
      throw new Error(
        `invokeMethod: request input for ${scopeId} was not ready`,
      );
    }

    const buttonId = `invoke-method-${scopeId}-btn`;
    await ChromeCdpHelpers.waitForElementEnabledByIdInWebView(
      getMultichainTestDappBaseUrl(),
      buttonId,
      OPERATION_TIMEOUT_MS,
    );
    await this.clickDappButton(buttonId, `invoke ${method} on ${chainId}`);
  }

  private async clickDappButton(
    elementId: string,
    operation: string,
  ): Promise<void> {
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      getMultichainTestDappBaseUrl(),
      elementId,
      OPERATION_TIMEOUT_MS,
    );
    if (!clicked) {
      throw new Error(
        `Multichain test dapp could not ${operation}: #${elementId} was not clicked`,
      );
    }
  }

  async tapConfirmButton(): Promise<void> {
    await Gestures.waitAndTap(
      Matchers.getElementByID(ConfirmationFooterSelectorIDs.CONFIRM_BUTTON),
      {
        checkForDisplayed: true,
        checkEnabled: true,
        elemDescription: 'MultichainTestDApp confirm button',
      },
    );
  }

  async tapCancelButton(timeout = 15_000): Promise<void> {
    await Gestures.waitAndTap(
      Matchers.getElementByID(ConfirmationFooterSelectorIDs.CANCEL_BUTTON),
      {
        timeout,
        checkForDisplayed: true,
        elemDescription: 'MultichainTestDApp cancel button',
      },
    );
  }

  async subscribeToChainEvents(chainId: string): Promise<boolean> {
    const clicked = await ChromeCdpHelpers.clickByIdInWebView(
      getMultichainTestDappBaseUrl(),
      `${SELECTORS.DIRECT_INVOKE_PREFIX}eip155-${chainId}-eth_subscribe`,
    );
    if (!clicked) return false;
    const resultId = `${SELECTORS.INVOKE_METHOD_RESULT_PREFIX}eip155-${chainId}-eth_subscribe-result-0`;
    const text = await ChromeCdpHelpers.waitForElementTextInWebView(
      getMultichainTestDappBaseUrl(),
      resultId,
      10_000,
    );
    return text !== null && text.trim().length > 0;
  }

  async isNotificationContainerEmpty(): Promise<boolean> {
    return (
      (await ChromeCdpHelpers.readTextByIdInWebView(
        getMultichainTestDappBaseUrl(),
        SELECTORS.WALLET_NOTIFY_EMPTY,
      )) !== null
    );
  }

  async hasNotifications(): Promise<boolean> {
    return (
      (await ChromeCdpHelpers.waitForElementTextInWebView(
        getMultichainTestDappBaseUrl(),
        `${SELECTORS.WALLET_NOTIFY_DETAILS}0`,
        50_000,
      )) !== null
    );
  }
}

export default new MultichainTestDApp();
