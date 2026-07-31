import { loginToAppPlaywright } from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import { MultichainTestDappViewSelectorsIDs } from '../../selectors/Browser/MultichainTestDapp.selectors.js';
import MultichainUtilities from '../../helpers/multichain/MultichainUtilities.js';
import { ConfirmationFooterSelectorIDs } from '../../../app/components/Views/confirmations/ConfirmationView.testIds';

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
const BASE_URL = `http://localhost:${MULTICHAIN_DAPP_PORT}`;
const DEFAULT_URL_PARAMS = '?autoMode=true';

const ALL_CHAIN_IDS = [
  MultichainUtilities.CHAIN_IDS.ETHEREUM_MAINNET,
  MultichainUtilities.CHAIN_IDS.LINEA_MAINNET,
  MultichainUtilities.CHAIN_IDS.ARBITRUM_ONE,
  MultichainUtilities.CHAIN_IDS.AVALANCHE,
  MultichainUtilities.CHAIN_IDS.OPTIMISM,
  MultichainUtilities.CHAIN_IDS.POLYGON,
  MultichainUtilities.CHAIN_IDS.ZKSYNC_ERA,
  MultichainUtilities.CHAIN_IDS.BASE,
  MultichainUtilities.CHAIN_IDS.BSC,
  MultichainUtilities.CHAIN_IDS.LOCALHOST,
];

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
    if (!clicked) return false;
    this.connected = true;
    return true;
  }

  async createSessionWithNetworks(chainIds: string[]): Promise<void> {
    await this.scrollToPageTop();
    await this.useAutoConnectButton();

    for (const chainId of ALL_CHAIN_IDS) {
      const checkboxId = `${SELECTORS.NETWORK_CHECKBOX_PREFIX}eip155-${chainId}`;
      await this.setCheckboxState(checkboxId, chainIds.includes(chainId));
    }

    await this.clearSessionResult();
    await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.CREATE_SESSION_BUTTON,
    );

    try {
      await DappConnectionModal.tapConnectButton({ timeout: 8_000 });
    } catch {
      // No modal — session may already be approved
    }

    await ChromeCdpHelpers.waitForElementTextInWebView(
      BASE_URL,
      `${SELECTORS.SESSION_METHOD_RESULT}0`,
      10_000,
    );
  }

  async tapGetSessionButton(): Promise<void> {
    await this.clearSessionResult();
    await ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      SELECTORS.GET_SESSION_BUTTON,
    );
  }

  async tapRevokeSessionButton(): Promise<void> {
    await this.clearSessionResult();
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
      10_000,
    );
    if (!text)
      throw new Error(`getSessionData: timed out waiting for #${resultId}`);
    const parsed = JSON.parse(text);
    return {
      success: Boolean(
        parsed.sessionScopes && Object.keys(parsed.sessionScopes).length > 0,
      ),
      sessionScopes: parsed.sessionScopes ?? {},
    };
  }

  async getSessionChangedEventData(index = 0): Promise<string | null> {
    return ChromeCdpHelpers.readTextByIdInWebView(
      BASE_URL,
      `${SELECTORS.WALLET_SESSION_CHANGED_RESULT}${index}`,
    );
  }

  async invokeMethodOnChain(chainId: string, method: string): Promise<boolean> {
    return ChromeCdpHelpers.clickByIdInWebView(
      BASE_URL,
      `${SELECTORS.DIRECT_INVOKE_PREFIX}eip155-${chainId}-${method}`,
    );
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

  private async clearSessionResult(resultIndex = 0): Promise<void> {
    const elementId = `${SELECTORS.SESSION_METHOD_RESULT}${resultIndex}`;
    await ChromeCdpHelpers.evaluateInWebView(
      BASE_URL,
      `(() => { const el = document.getElementById(${JSON.stringify(elementId)}); if (el) el.textContent = ''; })()`,
    ).catch(() => undefined);
  }

  private async setCheckboxState(
    webId: string,
    checked: boolean,
  ): Promise<void> {
    const isChecked = await ChromeCdpHelpers.evaluateInWebView<boolean>(
      BASE_URL,
      `(() => {
        const el = document.getElementById(${JSON.stringify(webId)});
        return el instanceof HTMLInputElement ? el.checked : false;
      })()`,
    );
    if (isChecked === null) {
      throw new Error(
        `setCheckboxState: element #${webId} not found in WebView`,
      );
    }
    if (Boolean(isChecked) !== checked) {
      const clicked = await ChromeCdpHelpers.clickByIdInWebView(
        BASE_URL,
        webId,
      );
      if (!clicked) {
        throw new Error(`setCheckboxState: failed to click #${webId}`);
      }
    }
  }
}

export default new MultichainTestDApp();
