import ChromeCdpHelpers from '../../framework/ChromeCdpHelpers.js';
import {
  loginToAppPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import { navigateToBrowserView } from '../../flows/browser.flow.js';
import BrowserView from './BrowserView.js';
import DappConnectionModal from '../MMConnect/DappConnectionModal.js';
import PlaywrightMatchers from '../../framework/PlaywrightMatchers';
import PlaywrightGestures from '../../framework/PlaywrightGestures';
import Utilities from '../../framework/Utilities.js';
import { dataTestIds } from '@metamask/test-dapp-bitcoin';

export const BITCOIN_DAPP_PORT = 8094;
const BASE_URL = `http://localhost:${BITCOIN_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;
/** Hold Connected + btc_connection + wallets before reload (replaces blind 1s sleep). */
const STABILITY_WINDOW_MS = 1_000;

const { header, walletSelectionModal, signMessage } = dataTestIds.testPage;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

class BitcoinTestDapp {
  private async getConnectionStatus(): Promise<string | null> {
    return this.evaluate<string>(
      `document.querySelector(${JSON.stringify(sel(header.connectionStatus))})?.textContent?.trim() || null`,
    ).catch(() => null);
  }

  private async isConnectSheetVisible(): Promise<boolean> {
    return Utilities.isElementVisible(DappConnectionModal.connectButton, 500);
  }

  /**
   * Count wallet-standard wallets currently registered with the page
   * (same discovery path the Bitcoin test dapp uses).
   */
  private async getWalletCount(): Promise<number> {
    const count = await this.evaluate<number>(`(() => {
      const found = [];
      const register = (...wallets) => {
        for (const w of wallets) found.push(w);
      };
      try {
        window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {
          detail: { register },
          bubbles: false,
          cancelable: false,
          composed: false,
        }));
      } catch {
        return 0;
      }
      return found.length;
    })()`);
    return count ?? 0;
  }

  async setupAndNavigate(): Promise<void> {
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    await navigateToBrowserView();
    await dismissPushNotificationExistingUserSheet();
    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL);
    await this.waitForDappLoaded();
  }

  private async evaluate<T>(expression: string): Promise<T | null> {
    return ChromeCdpHelpers.evaluateInWebView<T>(BASE_URL, expression);
  }

  /** Waits until the dapp header has rendered (connection status is readable). */
  private async waitForDappLoaded(
    timeoutMs = DAPP_LOAD_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = await this.getConnectionStatus();
      if (text) return;
      await wait(POLL_MS);
    }
    throw new Error(
      `Timed out waiting for Bitcoin test dapp to load within ${timeoutMs}ms`,
    );
  }

  private async waitForElement(
    cssSelector: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const exists = await this.evaluate<boolean>(
        `Boolean(document.querySelector(${JSON.stringify(cssSelector)}))`,
      );
      if (exists) return;
      await wait(POLL_MS);
    }
    throw new Error(`Timed out waiting for "${cssSelector}" to appear`);
  }

  private async click(
    cssSelector: string,
    timeoutMs = CLICK_TIMEOUT_MS,
  ): Promise<void> {
    await this.waitForElement(cssSelector, timeoutMs);
    const clicked = await this.evaluate<boolean>(
      `(() => {
        const el = document.querySelector(${JSON.stringify(cssSelector)});
        if (!el) return false;
        el.click();
        return true;
      })()`,
    );
    if (!clicked) {
      throw new Error(`Element not found in WebView: ${cssSelector}`);
    }
  }

  private async pollForText(
    cssSelector: string,
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let actual: string | null = null;
    while (Date.now() < deadline) {
      actual = await this.evaluate<string>(
        `document.querySelector(${JSON.stringify(cssSelector)})?.textContent?.trim() || null`,
      ).catch(() => null);
      if (actual === expected) return;
      await wait(POLL_MS);
    }
    throw new Error(`Timed out: expected "${expected}", got "${actual}"`);
  }

  private async waitForReconnect(
    timeoutMs = CONNECT_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastConnectAttemptAt = 0;
    let actual: string | null = null;

    while (Date.now() < deadline) {
      actual = await this.getConnectionStatus();
      if (actual === 'Connected') return;

      // Auto-reconnect may re-open the MetaMask connect sheet after wallets register.
      if (Date.now() - lastConnectAttemptAt >= 3_000) {
        lastConnectAttemptAt = Date.now();
        try {
          await DappConnectionModal.tapConnectButton({ timeout: 1_000 });
        } catch {
          // Connect sheet not shown yet.
        }
      }

      await wait(POLL_MS);
    }

    throw new Error(
      `Timed out waiting for reconnect: expected "Connected", got "${actual}"`,
    );
  }

  /**
   * The Bitcoin test dapp stores `{ walletName, connectionType }` in
   * `localStorage.btc_connection` after a successful connect. Auto-reconnect
   * after reload depends on that key plus wallet-standard providers still
   * being registered. Wait until Connected + persisted key + walletCount>0
   * hold continuously for STABILITY_WINDOW_MS (same budget as the old 1s
   * sleep, but tied to state).
   */
  private async getPersistedConnection(): Promise<Record<
    string,
    unknown
  > | null> {
    return this.evaluate<Record<string, unknown> | null>(`(() => {
      const raw = localStorage.getItem('btc_connection');
      if (!raw) return null;
      try {
        return JSON.parse(raw);
      } catch {
        return { parseError: true, raw };
      }
    })()`);
  }

  private async getPreReloadReadiness(): Promise<{
    status: string | null;
    persisted: Record<string, unknown> | null;
    walletCount: number;
  }> {
    const status = await this.getConnectionStatus();
    const persisted = await this.getPersistedConnection();
    const walletCount = await this.getWalletCount();
    return { status, persisted, walletCount };
  }

  private isPreReloadReady(snapshot: {
    status: string | null;
    persisted: Record<string, unknown> | null;
    walletCount: number;
  }): boolean {
    return (
      snapshot.status === 'Connected' &&
      !!snapshot.persisted &&
      typeof snapshot.persisted.walletName === 'string' &&
      snapshot.persisted.walletName.length > 0 &&
      snapshot.walletCount > 0
    );
  }

  private async waitForStableConnectionBeforeReload(
    timeoutMs = CONNECT_TIMEOUT_MS,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let stableSince: number | null = null;
    let last = {
      status: null as string | null,
      persisted: null as Record<string, unknown> | null,
      walletCount: 0,
    };

    while (Date.now() < deadline) {
      last = await this.getPreReloadReadiness();
      if (this.isPreReloadReady(last)) {
        if (stableSince == null) {
          stableSince = Date.now();
        } else if (Date.now() - stableSince >= STABILITY_WINDOW_MS) {
          return;
        }
      } else {
        stableSince = null;
      }
      await wait(POLL_MS);
    }

    throw new Error(
      `Timed out waiting for stable pre-reload connection (last=${JSON.stringify(last)})`,
    );
  }

  async connect(): Promise<void> {
    await this.click(`button${sel(header.connect)}`);
    await this.waitForElement(
      `button${sel(walletSelectionModal.walletOption)}`,
    );
    await this.click(`button${sel(walletSelectionModal.walletOption)}`);
    await this.click(`button${sel(walletSelectionModal.standardButton)}`);
    await DappConnectionModal.tapConnectButton({ timeout: 15_000 });
    await this.verifyConnectionStatus('Connected', CONNECT_TIMEOUT_MS);
  }

  async disconnect(): Promise<void> {
    await this.click(`button${sel(header.disconnect)}`);
  }

  async verifyConnectionStatus(
    expected: string,
    timeoutMs = 10_000,
  ): Promise<void> {
    await this.pollForText(sel(header.connectionStatus), expected, timeoutMs);
  }

  async verifyAccount(expected: string, timeoutMs = 10_000): Promise<void> {
    await this.pollForText(`${sel(header.account)} a`, expected, timeoutMs);
  }

  async signMessage(): Promise<void> {
    await this.click(`button${sel(signMessage.signMessage)}`);
  }

  async confirmSignMessage(): Promise<void> {
    const el = await PlaywrightMatchers.getElementByText('Approve', true);
    await PlaywrightGestures.waitAndTap(el, {
      checkForDisplayed: true,
      timeout: 15_000,
    });
  }

  async verifySignedMessage(
    expected: string,
    timeoutMs = 15_000,
  ): Promise<void> {
    await this.pollForText(sel(signMessage.signedMessage), expected, timeoutMs);
  }

  async reload(): Promise<void> {
    await this.waitForStableConnectionBeforeReload();

    // IIFE: iOS evaluateInWebView wraps as `return (${expression})`.
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();
    await this.waitForReconnect();
  }
}

export default new BitcoinTestDapp();
