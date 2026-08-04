import test from '@playwright/test';
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
import { getDriver } from '../../framework/PlaywrightUtilities.js';
import { logger } from '../../framework/logger.js';
import Utilities from '../../framework/Utilities.js';
import { dataTestIds } from '@metamask/test-dapp-bitcoin';

export const BITCOIN_DAPP_PORT = 8094;
const BASE_URL = `http://localhost:${BITCOIN_DAPP_PORT}`;

const DAPP_LOAD_TIMEOUT_MS = 30_000;
const CONNECT_TIMEOUT_MS = 30_000;
const CLICK_TIMEOUT_MS = 15_000;
const POLL_MS = 300;
const RECONNECT_LOG_INTERVAL_MS = 5_000;

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
   * Debug-only snapshot of Bitcoin wallet-standard availability in the page.
   * Dispatches `wallet-standard:app-ready` so any injected wallet re-registers
   * with this probe (same discovery path the dapp uses).
   */
  private async getProviderSnapshot(): Promise<Record<string, unknown>> {
    const walletOptionSelector = `button${sel(walletSelectionModal.walletOption)}`;
    try {
      const snapshot = await this.evaluate<Record<string, unknown>>(`(() => {
        const found = [];
        const register = (...wallets) => {
          for (const w of wallets) {
            found.push({
              name: w && w.name != null ? String(w.name) : null,
              version: w && w.version != null ? String(w.version) : null,
              chains: Array.isArray(w && w.chains) ? w.chains.map(String) : [],
              features: w && w.features ? Object.keys(w.features) : [],
            });
          }
        };
        let appReadyError = null;
        try {
          window.dispatchEvent(new CustomEvent('wallet-standard:app-ready', {
            detail: { register },
            bubbles: false,
            cancelable: false,
            composed: false,
          }));
        } catch (e) {
          appReadyError = String(e && e.message ? e.message : e);
        }
        const bodyText = document.body ? (document.body.innerText || '') : '';
        return {
          walletCount: found.length,
          wallets: found,
          appReadyError,
          hasEthereum: typeof window.ethereum !== 'undefined',
          ethereumIsMetaMask: !!(window.ethereum && window.ethereum.isMetaMask),
          navigatorWalletsLength: Array.isArray(window.navigator && window.navigator.wallets)
            ? window.navigator.wallets.length
            : null,
          walletOptionCount: document.querySelectorAll(${JSON.stringify(walletOptionSelector)}).length,
          noWalletAvailableText: bodyText.includes('No wallet available'),
          connectionStatus: document.querySelector(${JSON.stringify(sel(header.connectionStatus))})?.textContent?.trim() || null,
        };
      })()`);
      return snapshot ?? { error: 'evaluate returned null' };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /** Debug-only: log provider snapshot + attach a screenshot. Never throws. */
  private async debugCapture(label: string, details?: string): Promise<void> {
    const provider = await this.getProviderSnapshot();
    const message = details
      ? `[BitcoinTestDapp.reload] ${label}: ${details} provider=${JSON.stringify(provider)}`
      : `[BitcoinTestDapp.reload] ${label}: provider=${JSON.stringify(provider)}`;
    logger.info(message);
    try {
      const drv = getDriver();
      if (!drv) return;
      const screenshot = await drv.takeScreenshot();
      await test.info().attach(`btc-reload-${label}`, {
        body: Buffer.from(screenshot, 'base64'),
        contentType: 'image/png',
      });
      await test.info().attach(`btc-reload-${label}-provider.json`, {
        body: Buffer.from(JSON.stringify(provider, null, 2), 'utf8'),
        contentType: 'application/json',
      });
    } catch (error) {
      logger.warn(
        `[BitcoinTestDapp.reload] screenshot failed for ${label}:`,
        error,
      );
    }
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
    let connectSheetSeen = false;
    let connectTapCount = 0;

    while (Date.now() < deadline) {
      actual = await this.getConnectionStatus();
      const elapsedMs = Date.now() - startedAt;

      if (actual === 'Connected') {
        await this.debugCapture(
          'reconnect-success',
          `status=Connected elapsedMs=${elapsedMs} connectSheetSeen=${connectSheetSeen} connectTapCount=${connectTapCount}`,
        );
        return;
      }

      if (elapsedMs - lastLogAt >= RECONNECT_LOG_INTERVAL_MS) {
        lastLogAt = elapsedMs;
        const sheetVisible = await this.isConnectSheetVisible();
        if (sheetVisible) connectSheetSeen = true;
        await this.debugCapture(
          `reconnect-poll-${elapsedMs}ms`,
          `status=${JSON.stringify(actual)} connectSheetVisible=${sheetVisible} connectTapCount=${connectTapCount}`,
        );
      }

      if (Date.now() - lastConnectAttemptAt >= 3_000) {
        lastConnectAttemptAt = Date.now();
        const sheetVisible = await this.isConnectSheetVisible();
        if (sheetVisible) connectSheetSeen = true;
        logger.info(
          `[BitcoinTestDapp.reload] reconnect tap attempt at ${elapsedMs}ms: status=${JSON.stringify(actual)} connectSheetVisible=${sheetVisible}`,
        );
        try {
          await DappConnectionModal.tapConnectButton({ timeout: 1_000 });
          connectTapCount += 1;
          logger.info(
            `[BitcoinTestDapp.reload] reconnect tapConnectButton succeeded (tap #${connectTapCount})`,
          );
        } catch {
          // Connect sheet not shown yet.
        }
      }

      await wait(POLL_MS);
    }

    const sheetVisible = await this.isConnectSheetVisible();
    await this.debugCapture(
      'reconnect-timeout',
      `expected=Connected actual=${JSON.stringify(actual)} elapsedMs=${timeoutMs} connectSheetSeen=${connectSheetSeen} connectSheetVisibleNow=${sheetVisible} connectTapCount=${connectTapCount}`,
    );
    throw new Error(
      `Timed out waiting for reconnect: expected "Connected", got "${actual}" (connectSheetSeen=${connectSheetSeen}, connectTapCount=${connectTapCount})`,
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
    const statusBefore = await this.getConnectionStatus();
    await this.debugCapture(
      'before-reload',
      `status=${JSON.stringify(statusBefore)}`,
    );

    // IIFE: iOS evaluateInWebView wraps as `return (${expression})`.
    await this.evaluate('(() => { location.reload(); return true; })()');
    ChromeCdpHelpers.resetMetaMaskWebViewCache();
    await this.waitForDappLoaded();

    const statusAfterLoad = await this.getConnectionStatus();
    const sheetVisible = await this.isConnectSheetVisible();
    await this.debugCapture(
      'after-dapp-loaded',
      `status=${JSON.stringify(statusAfterLoad)} connectSheetVisible=${sheetVisible}`,
    );

    await this.waitForReconnect();
  }
}

export default new BitcoinTestDapp();
