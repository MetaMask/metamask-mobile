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
import { logger } from '../../framework/logger.js';
import { dataTestIds } from '@metamask/test-dapp-bitcoin';

export const BITCOIN_DAPP_PORT = 8094;
const BASE_URL = `http://localhost:${BITCOIN_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;
const RECONNECT_LOG_INTERVAL_MS = 5_000;
const CONNECT_PROBE_TIMEOUT_MS = 10_000;

const { header, walletSelectionModal, signMessage } = dataTestIds.testPage;

function sel(testId: string): string {
  return `[data-testid="${testId}"]`;
}

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

interface ReloadDiagnostics {
  status: string | null;
  persisted: Record<string, unknown> | null;
  walletCount: number;
  walletNames: string[];
  connectSheetVisible: boolean;
  /** Changes only when the document is replaced, so it proves a reload happened. */
  timeOrigin: number | null;
  navigationType: string | null;
}

interface ConnectProbeResult {
  state:
    | 'pending'
    | 'resolved'
    | 'rejected'
    | 'wallet-not-found'
    | 'evaluation-failed';
  walletName?: string;
  featureNames?: string[];
  accountCount?: number;
  accountChains?: string[][];
  error?: string;
}

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
   * Snapshot used to diagnose post-reload reconnect failures on CI.
   * Dispatches `wallet-standard:app-ready` the same way the dapp discovers wallets.
   */
  private async getReloadDiagnostics(): Promise<ReloadDiagnostics> {
    const status = await this.getConnectionStatus();
    const connectSheetVisible = await this.isConnectSheetVisible();
    const pageState = await this.evaluate<{
      persisted: Record<string, unknown> | null;
      walletCount: number;
      walletNames: string[];
      timeOrigin: number | null;
      navigationType: string | null;
    }>(`(() => {
      let persisted = null;
      try {
        const raw = localStorage.getItem('btc_connection');
        persisted = raw ? JSON.parse(raw) : null;
      } catch (e) {
        persisted = { parseError: String(e && e.message ? e.message : e) };
      }
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
        // ignore
      }
      let timeOrigin = null;
      let navigationType = null;
      try {
        timeOrigin = Math.round(performance.timeOrigin);
        const entry = performance.getEntriesByType('navigation')[0];
        navigationType = entry ? String(entry.type) : null;
      } catch {
        // ignore
      }
      return {
        persisted,
        walletCount: found.length,
        walletNames: found.map((w) => (w && w.name != null ? String(w.name) : 'unknown')),
        timeOrigin,
        navigationType,
      };
    })()`);

    return {
      status,
      persisted: pageState?.persisted ?? null,
      walletCount: pageState?.walletCount ?? 0,
      walletNames: pageState?.walletNames ?? [],
      connectSheetVisible,
      timeOrigin: pageState?.timeOrigin ?? null,
      navigationType: pageState?.navigationType ?? null,
    };
  }

  private logReloadDiagnostics(
    label: string,
    diagnostics: ReloadDiagnostics,
  ): void {
    logger.info(
      `[BitcoinTestDapp.reload] ${label}: ${JSON.stringify(diagnostics)}`,
    );
  }

  /**
   * Diagnoses whether MetaMask's Bitcoin provider can still connect after the
   * dapp's automatic reconnect has stalled. The probe is only run on timeout.
   */
  private async runConnectProbe(
    timeoutMs = CONNECT_PROBE_TIMEOUT_MS,
  ): Promise<ConnectProbeResult> {
    const started = await this.evaluate<ConnectProbeResult>(`(() => {
      const resultKey = '__metamaskBitcoinConnectProbe';
      const found = [];
      const register = (...wallets) => {
        for (const wallet of wallets) found.push(wallet);
      };
      window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {
        detail: { register },
        bubbles: false,
        cancelable: false,
        composed: false,
      }));

      const wallet = found.find(
        (candidate) => candidate && candidate.features && candidate.features['bitcoin:connect'],
      );
      if (!wallet) {
        return { state: 'wallet-not-found' };
      }

      const baseResult = {
        state: 'pending',
        walletName: String(wallet.name),
        featureNames: Object.keys(wallet.features),
      };
      window[resultKey] = baseResult;

      try {
        Promise.resolve(
          wallet.features['bitcoin:connect'].connect({ purposes: ['payment'] }),
        ).then(
          (output) => {
            const accounts = output && Array.isArray(output.accounts)
              ? output.accounts
              : [];
            window[resultKey] = {
              ...baseResult,
              state: 'resolved',
              accountCount: accounts.length,
              accountChains: accounts.map((account) =>
                Array.isArray(account.chains) ? account.chains.map(String) : []
              ),
            };
          },
          (error) => {
            window[resultKey] = {
              ...baseResult,
              state: 'rejected',
              error: String(error && error.message ? error.message : error),
            };
          },
        );
      } catch (error) {
        window[resultKey] = {
          ...baseResult,
          state: 'rejected',
          error: String(error && error.message ? error.message : error),
        };
      }

      return baseResult;
    })()`);

    if (!started) {
      return { state: 'evaluation-failed' };
    }
    if (started.state !== 'pending') {
      return started;
    }

    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const result = await this.evaluate<ConnectProbeResult>(
        `window.__metamaskBitcoinConnectProbe || null`,
      );
      if (result?.state && result.state !== 'pending') {
        return result;
      }
      await wait(POLL_MS);
    }

    return started;
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
    const startedAt = Date.now();
    const deadline = startedAt + timeoutMs;
    let lastConnectAttemptAt = 0;
    let lastLogAt = 0;
    let actual: string | null = null;
    let connectTapCount = 0;

    while (Date.now() < deadline) {
      actual = await this.getConnectionStatus();
      const elapsedMs = Date.now() - startedAt;

      if (actual === 'Connected') {
        const diagnostics = await this.getReloadDiagnostics();
        this.logReloadDiagnostics(
          `reconnect-success elapsedMs=${elapsedMs} connectTapCount=${connectTapCount}`,
          diagnostics,
        );
        return;
      }

      if (elapsedMs - lastLogAt >= RECONNECT_LOG_INTERVAL_MS) {
        lastLogAt = elapsedMs;
        const diagnostics = await this.getReloadDiagnostics();
        this.logReloadDiagnostics(
          `reconnect-poll elapsedMs=${elapsedMs} connectTapCount=${connectTapCount}`,
          diagnostics,
        );
      }

      // Auto-reconnect may re-open the MetaMask connect sheet after wallets register.
      if (Date.now() - lastConnectAttemptAt >= 3_000) {
        lastConnectAttemptAt = Date.now();
        try {
          await DappConnectionModal.tapConnectButton({ timeout: 1_000 });
          connectTapCount += 1;
        } catch {
          // Connect sheet not shown yet.
        }
      }

      await wait(POLL_MS);
    }

    const diagnostics = await this.getReloadDiagnostics();
    this.logReloadDiagnostics(
      `reconnect-timeout elapsedMs=${timeoutMs} connectTapCount=${connectTapCount}`,
      diagnostics,
    );
    const connectProbe = await this.runConnectProbe();
    logger.info(
      `[BitcoinTestDapp.reload] reconnect-timeout-connect-probe: ${JSON.stringify(connectProbe)}`,
    );
    throw new Error(
      `Timed out waiting for reconnect: expected "Connected", got "${actual}" diagnostics=${JSON.stringify(diagnostics)} connectProbe=${JSON.stringify(connectProbe)}`,
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

  /**
   * Match Detox `reloadBitcoinTestDApp`: resubmit via the browser URL bar
   * (full WebView navigation / provider reinjection), not CDP `location.reload()`.
   */
  async reload(): Promise<void> {
    const before = await this.getReloadDiagnostics();
    this.logReloadDiagnostics('before-reload', before);

    await BrowserView.tapUrlInputBox();
    await BrowserView.navigateToURL(BASE_URL);
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();

    const afterLoad = await this.getReloadDiagnostics();
    this.logReloadDiagnostics('after-dapp-loaded', afterLoad);

    await this.waitForReconnect();
  }
}

export default new BitcoinTestDapp();
